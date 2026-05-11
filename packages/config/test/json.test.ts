import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { JsonSizeError, PollutionError, safeParse } from '../src/index'

describe('safeParse', () => {
  it('parses simple JSON into null-prototype objects', () => {
    const r = safeParse('{"a":1,"b":"x"}') as Record<string, unknown>
    expect(Object.getPrototypeOf(r)).toBeNull()
    expect(r.a).toBe(1)
    expect(r.b).toBe('x')
  })

  it('null-protos nested objects', () => {
    const r = safeParse('{"nested":{"deep":{"x":1}}}') as Record<string, unknown>
    expect(Object.getPrototypeOf(r)).toBeNull()
    expect(Object.getPrototypeOf((r.nested as Record<string, unknown>).deep as object)).toBeNull()
  })

  it('rejects __proto__ key', () => {
    expect(() => safeParse('{"__proto__":{"polluted":true}}')).toThrow(PollutionError)
    // biome-ignore lint/suspicious/noExplicitAny: pollution probe
    expect(({} as any).polluted).toBeUndefined()
  })

  it('rejects nested __proto__ key', () => {
    expect(() => safeParse('{"a":{"__proto__":{}}}')).toThrow(PollutionError)
  })

  it('rejects prototype key', () => {
    expect(() => safeParse('{"prototype":1}')).toThrow(PollutionError)
  })

  it('rejects constructor key', () => {
    expect(() => safeParse('{"constructor":1}')).toThrow(PollutionError)
  })

  it('enforces size cap', () => {
    const huge = `"${'a'.repeat(2_000_000)}"`
    expect(() => safeParse(huge, { maxBytes: 1_048_576 })).toThrow(JsonSizeError)
  })

  it('preserves arrays', () => {
    const r = safeParse('[1,2,{"x":3}]') as unknown[]
    expect(Array.isArray(r)).toBe(true)
    expect(r[0]).toBe(1)
    expect(Object.getPrototypeOf(r[2] as object)).toBeNull()
  })

  it('throws SyntaxError on malformed input', () => {
    expect(() => safeParse('{invalid')).toThrow(SyntaxError)
  })

  it('handles scalars', () => {
    expect(safeParse('42')).toBe(42)
    expect(safeParse('"hi"')).toBe('hi')
    expect(safeParse('true')).toBe(true)
    expect(safeParse('null')).toBe(null)
  })
})

describe('safeParse: fuzz', () => {
  it('Object.prototype never gets polluted', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1024 }), (s) => {
        // biome-ignore lint/suspicious/noExplicitAny: probe
        const before = (Object.prototype as any).cliKitConfigProbe
        try {
          safeParse(s)
        } catch {
          // ignore
        }
        // biome-ignore lint/suspicious/noExplicitAny: probe
        expect((Object.prototype as any).cliKitConfigProbe).toBe(before)
      }),
      { numRuns: 300 },
    )
  })
})
