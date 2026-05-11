/**
 * Schema definition + validation.
 *
 *   - `defineSchema(s)` — identity helper for type inference.
 *   - `walkSchema(s, fn)` — visit every field with its dot-path.
 *   - `validateField(def, value)` — coerce + validate one field.
 *   - `getDefaults(s)` — produce a tree of schema defaults.
 *   - `isFieldDef(x)` — type guard.
 */

import type { FieldDef, FieldType, Schema } from './types'

export function defineSchema<S extends Schema>(s: S): S {
  return s
}

export function isFieldDef(x: unknown): x is FieldDef {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof (x as { type?: unknown }).type === 'string' &&
    isFieldType((x as { type: string }).type)
  )
}

function isFieldType(t: string): t is FieldType {
  return (
    t === 'string' ||
    t === 'integer' ||
    t === 'number' ||
    t === 'boolean' ||
    t === 'enum' ||
    t === 'path' ||
    t === 'url' ||
    t === 'array' ||
    t === 'object' ||
    t === 'json'
  )
}

export type SchemaVisitor = (path: string, def: FieldDef) => void

export function walkSchema(schema: Schema, fn: SchemaVisitor, prefix = ''): void {
  for (const [key, value] of Object.entries(schema)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (isFieldDef(value)) {
      fn(next, value)
    } else {
      walkSchema(value as Schema, fn, next)
    }
  }
}

export function getDefaults(schema: Schema): Record<string, unknown> {
  const out: Record<string, unknown> = Object.create(null)
  walkSchema(schema, (path, def) => {
    if (def.default !== undefined) {
      setPath(out, path, def.default)
    }
  })
  return out
}

export function findFieldDef(schema: Schema, dotPath: string): FieldDef | null {
  const parts = dotPath.split('.')
  let cursor: Schema | FieldDef | undefined = schema
  for (const part of parts) {
    if (cursor === undefined || cursor === null) return null
    if (isFieldDef(cursor)) return null
    cursor = (cursor as Schema)[part]
  }
  return isFieldDef(cursor) ? cursor : null
}

export type ValidateResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: string }

const INT_RE = /^-?(?:0|[1-9]\d*)$/
const NUM_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

const TRUE_LITERALS: ReadonlySet<string> = new Set(['true', '1', 'yes', 'y', 'on'])
const FALSE_LITERALS: ReadonlySet<string> = new Set(['false', '0', 'no', 'n', 'off'])

export function validateField(def: FieldDef, raw: unknown): ValidateResult {
  if (raw === undefined || raw === null) {
    if (def.required) return { ok: false, reason: 'missing required field' }
    return { ok: true, value: def.default }
  }
  switch (def.type) {
    case 'string':
      return validateString(def, raw)
    case 'integer':
      return validateInteger(def, raw)
    case 'number':
      return validateNumber(def, raw)
    case 'boolean':
      return validateBoolean(raw)
    case 'enum':
      return validateEnum(def, raw)
    case 'path':
      return validatePath(def, raw)
    case 'url':
      return validateUrl(raw)
    case 'array':
      return validateArray(def, raw)
    case 'object':
      return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
        ? { ok: true, value: raw }
        : { ok: false, reason: 'expected object' }
    case 'json':
      return { ok: true, value: raw }
  }
}

function validateString(def: FieldDef, raw: unknown): ValidateResult {
  if (typeof raw !== 'string') return { ok: false, reason: `expected string, got ${typeof raw}` }
  if (def.min !== undefined && raw.length < def.min) {
    return { ok: false, reason: `length < ${def.min}` }
  }
  if (def.max !== undefined && raw.length > def.max) {
    return { ok: false, reason: `length > ${def.max}` }
  }
  if (def.pattern) {
    // Bounded by max length; anchored evaluation.
    try {
      const re = new RegExp(def.pattern)
      if (!re.test(raw)) return { ok: false, reason: `does not match ${def.pattern}` }
    } catch {
      return { ok: false, reason: `bad pattern ${def.pattern}` }
    }
  }
  return { ok: true, value: raw }
}

function validateInteger(def: FieldDef, raw: unknown): ValidateResult {
  let n: number
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) return { ok: false, reason: 'not an integer' }
    n = raw
  } else if (typeof raw === 'string' && INT_RE.test(raw)) {
    n = Number(raw)
  } else {
    return { ok: false, reason: `expected integer, got ${typeof raw}` }
  }
  if (!Number.isSafeInteger(n)) return { ok: false, reason: 'integer out of safe range' }
  if (def.min !== undefined && n < def.min) return { ok: false, reason: `< ${def.min}` }
  if (def.max !== undefined && n > def.max) return { ok: false, reason: `> ${def.max}` }
  return { ok: true, value: n }
}

function validateNumber(def: FieldDef, raw: unknown): ValidateResult {
  let n: number
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    n = raw
  } else if (typeof raw === 'string' && NUM_RE.test(raw)) {
    n = Number(raw)
    if (!Number.isFinite(n)) return { ok: false, reason: 'non-finite number' }
  } else {
    return { ok: false, reason: `expected number, got ${typeof raw}` }
  }
  if (def.min !== undefined && n < def.min) return { ok: false, reason: `< ${def.min}` }
  if (def.max !== undefined && n > def.max) return { ok: false, reason: `> ${def.max}` }
  return { ok: true, value: n }
}

function validateBoolean(raw: unknown): ValidateResult {
  if (typeof raw === 'boolean') return { ok: true, value: raw }
  if (typeof raw === 'string') {
    const norm = raw.toLowerCase()
    if (TRUE_LITERALS.has(norm)) return { ok: true, value: true }
    if (FALSE_LITERALS.has(norm)) return { ok: true, value: false }
  }
  return { ok: false, reason: `expected boolean, got ${typeof raw}` }
}

function validateEnum(def: FieldDef, raw: unknown): ValidateResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'enum value must be string' }
  if (!def.values || !def.values.includes(raw)) {
    return { ok: false, reason: `not in [${def.values?.join(', ')}]` }
  }
  return { ok: true, value: raw }
}

function validatePath(def: FieldDef, raw: unknown): ValidateResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'path must be string' }
  let p = raw
  if (def.expandUser && p.startsWith('~/')) {
    const home =
      (typeof process !== 'undefined' && (process.env.HOME ?? process.env.USERPROFILE)) || '~'
    p = home + p.slice(1)
  }
  return { ok: true, value: p }
}

function validateUrl(raw: unknown): ValidateResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'url must be string' }
  try {
    const u = new URL(raw)
    // Reject dangerous schemes
    if (u.protocol === 'javascript:' || u.protocol === 'data:' || u.protocol === 'vbscript:') {
      return { ok: false, reason: `disallowed scheme: ${u.protocol}` }
    }
    return { ok: true, value: raw }
  } catch {
    return { ok: false, reason: 'invalid url' }
  }
}

function validateArray(def: FieldDef, raw: unknown): ValidateResult {
  if (!Array.isArray(raw)) return { ok: false, reason: 'expected array' }
  if (def.items) {
    const childDef: FieldDef = { type: def.items }
    for (let i = 0; i < raw.length; i++) {
      const r = validateField(childDef, raw[i])
      if (!r.ok) return { ok: false, reason: `[${i}]: ${r.reason}` }
    }
  }
  return { ok: true, value: raw }
}

// ──────────────────────────────────────────────────────────────────────────────
// dot-path tree manipulation
// ──────────────────────────────────────────────────────────────────────────────

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
])

export function setPath(obj: Record<string, unknown>, dotPath: string, value: unknown): boolean {
  const parts = dotPath.split('.')
  let cursor = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (part === undefined || FORBIDDEN_KEYS.has(part)) return false
    const next = cursor[part]
    if (next === undefined || next === null || typeof next !== 'object' || Array.isArray(next)) {
      const fresh: Record<string, unknown> = Object.create(null)
      cursor[part] = fresh
      cursor = fresh
    } else {
      cursor = next as Record<string, unknown>
    }
  }
  const last = parts[parts.length - 1]
  if (last === undefined || FORBIDDEN_KEYS.has(last)) return false
  cursor[last] = value
  return true
}

export function getPath(obj: Record<string, unknown>, dotPath: string): unknown {
  const parts = dotPath.split('.')
  let cursor: unknown = obj
  for (const part of parts) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') return undefined
    if (FORBIDDEN_KEYS.has(part)) return undefined
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return cursor
}
