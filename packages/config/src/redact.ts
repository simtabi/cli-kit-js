/**
 * Sensitive-value redaction for snapshots and logs.
 */

import { walkSchema } from './schema'
import { getPath, setPath } from './schema'
import type { Schema } from './types'

const REDACTED = '[REDACTED]'

/**
 * Returns a deep copy of `values` with any path marked `sensitive: true` or
 * `secret: true` in `schema` replaced with `'[REDACTED]'`.
 */
export function redactSensitive(
  values: Readonly<Record<string, unknown>>,
  schema: Schema,
): Record<string, unknown> {
  const out: Record<string, unknown> = cloneNull(values)
  walkSchema(schema, (path, def) => {
    if (!def.sensitive && !def.secret) return
    const v = getPath(out, path)
    if (v !== undefined) {
      setPath(out, path, REDACTED)
    }
  })
  return out
}

/**
 * Deep clone into null-prototype objects. Arrays are preserved as arrays
 * (no need to null-proto them; their prototype chain is harmless and access
 * patterns are different).
 */
export function cloneNull(input: unknown): unknown {
  if (input === null || typeof input !== 'object') return input
  if (Array.isArray(input)) return input.map(cloneNull)
  const out: Record<string, unknown> = Object.create(null)
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = cloneNull(value)
  }
  return out
}

/**
 * Deep-freeze a value tree so consumers can't mutate snapshots.
 */
export function deepFreeze<T>(input: T): T {
  if (input === null || typeof input !== 'object') return input
  if (Array.isArray(input)) {
    input.forEach(deepFreeze)
    return Object.freeze(input) as T
  }
  for (const value of Object.values(input as Record<string, unknown>)) {
    deepFreeze(value)
  }
  return Object.freeze(input) as T
}
