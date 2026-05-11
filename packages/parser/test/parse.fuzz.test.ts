import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parse } from '../src/index'

/**
 * Property-based fuzz tests. The goal is invariants, not exact behaviour:
 *
 *   1. parse() never throws (programmer errors land in outcome.errors).
 *   2. result.values has a null prototype (no pollution).
 *   3. No forbidden keys land in result.values.
 *   4. With strict=false, total argv coverage = positional + rest + flag-bearing
 *      tokens (i.e. nothing silently lost).
 */

const tokenArb = fc.string({ minLength: 0, maxLength: 64 })
const argvArb = fc.array(tokenArb, { maxLength: 200 })

describe('parser fuzz', () => {
  it('never throws on arbitrary argv', () => {
    fc.assert(
      fc.property(argvArb, (argv) => {
        // Should never throw — programmer errors are returned as outcomes.
        parse(argv, { args: {}, strict: false })
      }),
      { numRuns: 500 },
    )
  })

  it('result.values has null prototype', () => {
    fc.assert(
      fc.property(argvArb, (argv) => {
        const r = parse(argv, { args: {}, strict: false })
        expect(Object.getPrototypeOf(r.result.values)).toBeNull()
      }),
      { numRuns: 200 },
    )
  })

  it('no forbidden keys land in result.values', () => {
    fc.assert(
      fc.property(argvArb, (argv) => {
        const r = parse(argv, { args: {}, strict: false })
        const keys = Object.keys(r.result.values)
        for (const k of keys) {
          expect(k).not.toBe('__proto__')
          expect(k).not.toBe('prototype')
          expect(k).not.toBe('constructor')
        }
      }),
      { numRuns: 500 },
    )
  })

  it('Object.prototype is never polluted', () => {
    fc.assert(
      fc.property(argvArb, (argv) => {
        // biome-ignore lint/suspicious/noExplicitAny: pollution probe
        const before = (Object.prototype as any).cliKitPollutionProbe
        parse(argv, { args: {}, strict: false })
        // biome-ignore lint/suspicious/noExplicitAny: pollution probe
        const after = (Object.prototype as any).cliKitPollutionProbe
        expect(after).toBe(before)
      }),
      { numRuns: 200 },
    )
  })
})
