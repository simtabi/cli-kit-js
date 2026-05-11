import { describe, expect, it } from 'vitest'
import { createColors, strip } from '../src/index'

describe('createColors', () => {
  it('depth=0 is a no-op for all wrappers', () => {
    const c = createColors({ depth: 0 })
    expect(c.red('hello')).toBe('hello')
    expect(c.bold('hi')).toBe('hi')
    expect(c.bgYellow('x')).toBe('x')
    expect(c.fg256(208)('o')).toBe('o')
    expect(c.rgb(255, 0, 0)('r')).toBe('r')
  })

  it('depth=4 emits basic SGR', () => {
    const c = createColors({ depth: 4 })
    expect(c.red('x')).toBe('\x1b[31mx\x1b[39m')
    expect(c.bold('x')).toBe('\x1b[1mx\x1b[22m')
  })

  it('depth=8 uses 256-color sequences', () => {
    const c = createColors({ depth: 8 })
    expect(c.fg256(208)('x')).toBe('\x1b[38;5;208mx\x1b[39m')
    expect(c.bg256(15)('x')).toBe('\x1b[48;5;15mx\x1b[49m')
  })

  it('depth=24 uses truecolor', () => {
    const c = createColors({ depth: 24 })
    expect(c.rgb(255, 100, 50)('x')).toBe('\x1b[38;2;255;100;50mx\x1b[39m')
  })

  it('depth=8 falls back rgb→256', () => {
    const c = createColors({ depth: 8 })
    // any 38;5;N for a vivid color
    const out = c.rgb(255, 0, 0)('R')
    expect(out).toMatch(/^\x1b\[38;5;\d+mR\x1b\[39m$/)
  })

  it('depth=4 falls back rgb→basic', () => {
    const c = createColors({ depth: 4 })
    const out = c.rgb(255, 0, 0)('R')
    expect(out).toMatch(/^\x1b\[3\dmR\x1b\[39m$/)
  })

  it('strip undoes any color', () => {
    const c = createColors({ depth: 24 })
    expect(strip(c.rgb(1, 2, 3)('hi'))).toBe('hi')
    expect(strip(c.bold(c.green('hi')))).toBe('hi')
  })

  it('exposes immutable Colors object', () => {
    const c = createColors({ depth: 4 })
    expect(() => {
      // @ts-expect-error testing immutability at runtime
      c.red = () => 'mutated'
    }).toThrow()
  })

  it('depth field reflects construction', () => {
    expect(createColors({ depth: 0 }).depth).toBe(0)
    expect(createColors({ depth: 24 }).depth).toBe(24)
  })
})
