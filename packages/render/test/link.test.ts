import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { link, sanitizeUrl } from '../src/index'

const OSC = '\x1b]'
const ST = '\x1b\\'

describe('link', () => {
  it('emits OSC 8 by default for http URLs', () => {
    const out = link('docs', 'https://example.com')
    expect(out).toBe(`${OSC}8;;https://example.com/${ST}docs${OSC}8;;${ST}`)
  })

  it('falls back to plain when hyperlinks: false', () => {
    expect(link('docs', 'https://example.com', { hyperlinks: false })).toBe(
      'docs (https://example.com/)',
    )
  })

  it('forces plain over capability hint', () => {
    expect(link('x', 'https://e.com', { forcePlain: true })).toBe('x (https://e.com/)')
  })

  it('forces terminal over capability hint', () => {
    const out = link('x', 'https://e.com', { hyperlinks: false, forceTerminal: true })
    expect(out).toContain(OSC)
  })

  it('rejects javascript: scheme', () => {
    const out = link('click', 'javascript:alert(1)')
    expect(out).toBe('click (javascript:alert(1))')
    expect(out).not.toContain(OSC)
  })

  it('rejects data: scheme', () => {
    const out = link('click', 'data:text/html,<script>alert(1)</script>')
    expect(out).not.toContain(OSC)
    expect(out).not.toContain(`${OSC}8;;data:`)
  })

  it('rejects vbscript: scheme', () => {
    const out = link('x', 'vbscript:msgbox')
    expect(out).not.toContain(OSC)
  })

  it('rejects file: scheme', () => {
    const out = link('x', 'file:///etc/passwd')
    expect(out).not.toContain(OSC)
  })

  it('accepts mailto: scheme', () => {
    const out = link('email', 'mailto:hi@example.com')
    expect(out).toContain(`${OSC}8;;mailto:hi@example.com`)
  })

  it('falls back gracefully on unparseable URLs', () => {
    const out = link('broken', 'not a url')
    expect(out).toBe('broken (not a url)')
  })
})

describe('sanitizeUrl', () => {
  it('accepts http/https/mailto', () => {
    expect(sanitizeUrl('http://e.com')).toBe('http://e.com/')
    expect(sanitizeUrl('https://e.com/path?q=1')).toBe('https://e.com/path?q=1')
    expect(sanitizeUrl('mailto:hi@e.com')).toBe('mailto:hi@e.com')
  })

  it('rejects dangerous schemes', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('data:text/html,x')).toBeNull()
    expect(sanitizeUrl('vbscript:msgbox')).toBeNull()
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(sanitizeUrl('')).toBeNull()
    expect(sanitizeUrl('not a url')).toBeNull()
    expect(sanitizeUrl('://nothing')).toBeNull()
  })
})

describe('link: fuzz invariants', () => {
  it('never emits an OSC 8 link with a non-allowlisted scheme', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (urlish) => {
        const out = link('text', urlish)
        if (out.includes(`${OSC}8;;`)) {
          // If we DID emit the escape, the scheme must be allowed.
          const m = out.match(
            new RegExp(`${OSC.replace('[', '\\[')}8;;([^${ST.replace('[', '\\[')}]+)`),
          )
          if (m) {
            expect(/^(https?|mailto):/.test(m[1] ?? '')).toBe(true)
          }
        }
      }),
      { numRuns: 200 },
    )
  })
})
