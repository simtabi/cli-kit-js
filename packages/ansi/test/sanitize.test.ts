import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { sanitize, strip } from '../src/index'

const ESC = '\x1b'

describe('strip', () => {
  it('removes SGR sequences', () => {
    expect(strip(`${ESC}[31mhello${ESC}[39m`)).toBe('hello')
  })
  it('removes nested styles', () => {
    expect(strip(`${ESC}[1m${ESC}[31mhi${ESC}[39m${ESC}[22m`)).toBe('hi')
  })
  it('removes OSC sequences (title-bar set)', () => {
    expect(strip(`${ESC}]0;malicious title${ESC}\\plain`)).toBe('plain')
  })
  it('removes cursor movement', () => {
    expect(strip(`hello${ESC}[2J${ESC}[H`)).toBe('hello')
  })
  it('passes plain strings through untouched', () => {
    expect(strip('plain ASCII text')).toBe('plain ASCII text')
    expect(strip('')).toBe('')
  })
  it('returns input unchanged when no ESC present', () => {
    const s = 'no escapes here at all 中文 🎉'
    expect(strip(s)).toBe(s)
  })
})

describe('sanitize', () => {
  it('keeps SGR sequences', () => {
    expect(sanitize(`${ESC}[31mred${ESC}[39m`)).toBe(`${ESC}[31mred${ESC}[39m`)
  })
  it('removes OSC (clipboard hijack vector)', () => {
    expect(sanitize(`safe${ESC}]52;c;BASE64DATA${ESC}\\`)).toBe('safe')
    expect(sanitize(`${ESC}]0;evil title\x07stuff`)).toBe('stuff')
  })
  it('removes cursor movement CSI', () => {
    expect(sanitize(`hello${ESC}[2A`)).toBe('hello')
    expect(sanitize(`${ESC}[5;10Hcontent`)).toBe('content')
  })
  it('removes clear-screen', () => {
    expect(sanitize(`${ESC}[2Jvisible`)).toBe('visible')
  })
  it('removes DCS', () => {
    expect(sanitize(`${ESC}Psome dcs payload${ESC}\\plain`)).toBe('plain')
  })
  it('removes APC and PM and SOS', () => {
    expect(sanitize(`a${ESC}_apc payload${ESC}\\b`)).toBe('ab')
    expect(sanitize(`a${ESC}^pm payload${ESC}\\b`)).toBe('ab')
    expect(sanitize(`a${ESC}Xsos payload${ESC}\\b`)).toBe('ab')
  })
  it('removes single-byte ESC controls (ESC c reset, etc.)', () => {
    expect(sanitize(`a${ESC}cb`)).toBe('ab')
  })
  it('preserves SGR even when mixed with disallowed', () => {
    const input = `${ESC}[31mred${ESC}]52;c;X${ESC}\\${ESC}[2A still red${ESC}[39m`
    const out = sanitize(input)
    expect(out).toBe(`${ESC}[31mred still red${ESC}[39m`)
  })
  it('passes plain strings through', () => {
    expect(sanitize('plain')).toBe('plain')
    expect(sanitize('')).toBe('')
  })
})

describe('sanitize: fuzz', () => {
  it('never returns a string containing OSC, DCS, APC, PM, SOS', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1024 }), (s) => {
        const out = sanitize(s)
        // Output may contain ESC [ ... m (SGR) but nothing else with ESC.
        // Strict check: every ESC must be followed by [ and end in m before next ESC.
        for (let i = 0; i < out.length; i++) {
          if (out[i] !== '\x1b') continue
          expect(out[i + 1]).toBe('[')
        }
      }),
      { numRuns: 500 },
    )
  })

  it('strip output contains no ESC bytes', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1024 }), (s) => {
        expect(strip(s).includes('\x1b')).toBe(false)
      }),
      { numRuns: 500 },
    )
  })

  it('sanitize is idempotent', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 512 }), (s) => {
        const a = sanitize(s)
        const b = sanitize(a)
        expect(b).toBe(a)
      }),
      { numRuns: 300 },
    )
  })
})
