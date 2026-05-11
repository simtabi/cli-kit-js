/**
 * Type coercion for parser values. All functions are pure and total —
 * invalid input returns a discriminated `Coerced.err` rather than throwing.
 */

import type { ArgDef, ArgType } from './types'

export type CoerceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string }

const TRUE_LITERALS: ReadonlySet<string> = new Set(['true', '1', 'yes', 'y', 'on'])
const FALSE_LITERALS: ReadonlySet<string> = new Set(['false', '0', 'no', 'n', 'off'])

const INTEGER_RE = /^-?(?:0|[1-9]\d*)$/
const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

export function coerceBoolean(input: unknown): CoerceResult<boolean> {
  if (typeof input === 'boolean') return { ok: true, value: input }
  if (typeof input !== 'string') {
    return { ok: false, reason: `expected boolean, got ${typeof input}` }
  }
  const norm = input.toLowerCase()
  if (TRUE_LITERALS.has(norm)) return { ok: true, value: true }
  if (FALSE_LITERALS.has(norm)) return { ok: true, value: false }
  return { ok: false, reason: `not a recognised boolean literal: ${input}` }
}

export function coerceInteger(input: unknown): CoerceResult<number> {
  if (typeof input === 'number' && Number.isInteger(input)) {
    return { ok: true, value: input }
  }
  if (typeof input !== 'string') {
    return { ok: false, reason: `expected integer, got ${typeof input}` }
  }
  if (!INTEGER_RE.test(input)) {
    return { ok: false, reason: `not an integer: ${input}` }
  }
  const n = Number(input)
  if (!Number.isSafeInteger(n)) {
    return { ok: false, reason: `integer out of safe range: ${input}` }
  }
  return { ok: true, value: n }
}

export function coerceNumber(input: unknown): CoerceResult<number> {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return { ok: true, value: input }
  }
  if (typeof input !== 'string') {
    return { ok: false, reason: `expected number, got ${typeof input}` }
  }
  if (!NUMBER_RE.test(input)) {
    return { ok: false, reason: `not a number: ${input}` }
  }
  const n = Number(input)
  if (!Number.isFinite(n)) {
    return { ok: false, reason: `non-finite number: ${input}` }
  }
  return { ok: true, value: n }
}

/** Coerce a raw string value for an option of the given type. */
export function coerceForType(input: string, type: ArgType): CoerceResult<unknown> {
  switch (type) {
    case 'string':
      return { ok: true, value: input }
    case 'integer':
      return coerceInteger(input)
    case 'number':
      return coerceNumber(input)
    case 'boolean':
      return coerceBoolean(input)
    case 'count':
      // Count flags do not take values; an inline value is treated as integer.
      return coerceInteger(input)
    case 'positional':
      return { ok: true, value: input }
  }
}

export function isEnumValid(def: ArgDef, value: unknown): boolean {
  if (!def.values || def.values.length === 0) return true
  return def.values.includes(String(value))
}
