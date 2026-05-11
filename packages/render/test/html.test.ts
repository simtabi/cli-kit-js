import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ansiToHtml, ansiToPlainHtml, escapeHtml } from '../src/html'

describe('escapeHtml', () => {
  it('escapes the six dangerous chars', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;',
    )
    expect(escapeHtml(`a'b`)).toContain('&#39;')
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('idempotent for safe input', () => {
    expect(escapeHtml('plain text')).toBe('plain text')
  })
})

describe('ansiToHtml', () => {
  it('plain text becomes plain text (no spans)', () => {
    expect(ansiToHtml('hello')).toBe('hello')
  })

  it('escapes HTML metacharacters in plain input', () => {
    expect(ansiToHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;&#x2F;b&gt;')
  })

  it('wraps SGR-coloured runs in styled spans', () => {
    const out = ansiToHtml('\x1b[31mred\x1b[39m')
    expect(out).toContain('<span style="color: red">red</span>')
  })

  it('handles bold', () => {
    expect(ansiToHtml('\x1b[1mbold\x1b[22m')).toContain('font-weight: bold')
  })

  it('handles truecolor', () => {
    expect(ansiToHtml('\x1b[38;2;10;20;30mrgb\x1b[39m')).toContain('rgb(10, 20, 30)')
  })

  it('handles 256-color cube', () => {
    expect(ansiToHtml('\x1b[38;5;208morange\x1b[39m')).toMatch(/<span style="color: rgb\(.*\)">orange<\/span>/)
  })

  it('drops disallowed (non-SGR) escapes', () => {
    // OSC clipboard hijack + cursor move + screen clear should be stripped.
    expect(ansiToHtml('\x1b]52;c;evil\x1b\\hi')).toBe('hi')
    expect(ansiToHtml('\x1b[2Jhi')).toBe('hi')
  })

  it('never emits <script>', () => {
    const adversarial = `\x1b[31m<script>alert("x")</script>\x1b[39m`
    const out = ansiToHtml(adversarial)
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(')
  })

  it('never emits event handlers in attribute position', () => {
    const adversarial = 'onerror=alert(1) " onclick="evil"'
    const out = ansiToHtml(adversarial)
    // attribute-position check: every `="` we emit is part of our own `style="…"` or `class="…"`.
    // The escape-HTML pass turns user double-quotes into &quot;
    expect(out).not.toMatch(/=&quot;[^&]+&quot; *[a-z]+=/)
  })

  it('className wrapper sanitises non-safe chars', () => {
    const out = ansiToHtml('x', { className: 'foo" onclick="x' })
    // The crafted class string must NOT have produced an onclick attribute.
    expect(out).toContain('class="fooonclickx"')
    expect(out).not.toContain('onclick=')
  })
})

describe('ansiToHtml: fuzz invariants', () => {
  it('output never contains <script', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 512 }), (s) => {
        expect(ansiToHtml(s).toLowerCase()).not.toContain('<script')
      }),
      { numRuns: 500 },
    )
  })

  it('output never contains "javascript:" or "data:" URLs', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 512 }), (s) => {
        const out = ansiToHtml(s).toLowerCase()
        expect(out).not.toContain('javascript:')
        expect(out).not.toContain('vbscript:')
        // We don't emit href= at all, so even a literal "data:" in user text
        // is fine. We still assert no attribute-bearing data: appears.
        expect(out).not.toMatch(/href=[^>]*data:/)
      }),
      { numRuns: 300 },
    )
  })

  it('output never contains on* event-handler attributes', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 512 }), (s) => {
        const out = ansiToHtml(s)
        // We only emit `style="…"` and (optionally) `class="…"`. Any attempt
        // to escape the attribute via raw input would have been &quot;-ed.
        expect(out).not.toMatch(/ on[a-z]+=/i)
      }),
      { numRuns: 300 },
    )
  })

  it('output never contains unescaped raw user "<" outside our tags', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (s) => {
        const out = ansiToHtml(s)
        // Remove our own <span ...> openings and </span> closings.
        const stripped = out.replace(/<\/?span[^>]*>/g, '')
        expect(stripped).not.toContain('<')
      }),
      { numRuns: 300 },
    )
  })
})

describe('ansiToPlainHtml', () => {
  it('strips ANSI and escapes HTML', () => {
    expect(ansiToPlainHtml('\x1b[31m<b>x</b>\x1b[39m')).toBe('&lt;b&gt;x&lt;&#x2F;b&gt;')
  })
})
