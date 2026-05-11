/**
 * Prototype-pollution-safe JSON parsing.
 *
 * `JSON.parse` itself ignores `__proto__` keys (they bypass the [[Set]] trap),
 * but if a downstream consumer copies the result into a plain object via
 * `Object.assign` or spread, the prototype-pollution route opens. We close it
 * at parse time: any object with a forbidden key is rejected.
 *
 * Forbidden keys:
 *   - `__proto__`
 *   - `prototype`
 *   - `constructor` (only when its value is a non-data, non-plain object)
 *
 * Output uses `Object.create(null)` for every object node so the result has
 * no inherited prototype-chain at all.
 */

const FORBIDDEN_OBJECT_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
])

export class PollutionError extends Error {
  constructor(
    public readonly key: string,
    public readonly path: string,
  ) {
    super(`forbidden key "${key}" at ${path}`)
    this.name = 'PollutionError'
  }
}

export class JsonSizeError extends Error {
  constructor(public readonly bytes: number, public readonly cap: number) {
    super(`JSON input is ${bytes} bytes; cap is ${cap}`)
    this.name = 'JsonSizeError'
  }
}

const UTF8 = new TextEncoder()

export interface SafeParseOptions {
  readonly maxBytes?: number
  readonly path?: string
}

/**
 * Parse JSON text into a null-prototype object tree.
 *
 * Throws `JsonSizeError` if input exceeds `maxBytes`.
 * Throws `PollutionError` if a forbidden key appears anywhere in the tree.
 * Throws standard `SyntaxError` for malformed JSON.
 */
export function safeParse(text: string, opts: SafeParseOptions = {}): unknown {
  if (opts.maxBytes !== undefined) {
    const bytes = UTF8.encode(text).length
    if (bytes > opts.maxBytes) {
      throw new JsonSizeError(bytes, opts.maxBytes)
    }
  }
  // Pre-scan: cheap reject for files that literally contain "__proto__":...
  // This catches the common case before we walk the tree.
  if (text.includes('"__proto__"')) {
    throw new PollutionError('__proto__', opts.path ?? '<input>')
  }

  const raw = JSON.parse(text) as unknown
  return reviveSafe(raw, opts.path ?? '$')
}

/**
 * Recursively rebuild the value with null-prototype objects, rejecting
 * forbidden keys.
 */
function reviveSafe(value: unknown, path: string): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((v, i) => reviveSafe(v, `${path}[${i}]`))
  }
  // Plain object — copy onto null-prototype
  const out = Object.create(null) as Record<string, unknown>
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) {
      throw new PollutionError(key, `${path}.${key}`)
    }
    const child = (value as Record<string, unknown>)[key]
    out[key] = reviveSafe(child, `${path}.${key}`)
  }
  return out
}
