/**
 * Property-name validation and prototype-pollution defense.
 *
 * Parser result objects are built with `Object.create(null)`, so a key like
 * `__proto__` cannot actually pollute Object.prototype — but we still reject
 * those keys defensively, both to keep error messages clear and to defeat any
 * future refactor that swaps the storage to a plain object.
 */

const ALLOWED_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'prototype', 'constructor'])

export function isAllowedKey(key: string): boolean {
  if (key.length === 0 || key.length > 128) return false
  if (FORBIDDEN_KEYS.has(key)) return false
  return ALLOWED_KEY.test(key)
}

export function nullObject<T extends Record<string, unknown> = Record<string, unknown>>(): T {
  return Object.create(null) as T
}

/** Set a property on a null-prototype object after validating the key. */
export function safeSet(obj: Record<string, unknown>, key: string, value: unknown): boolean {
  if (!isAllowedKey(key)) return false
  obj[key] = value
  return true
}
