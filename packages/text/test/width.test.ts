import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { codepointWidth, width } from '../src/index'

describe('codepointWidth', () => {
  it('ASCII printable = 1', () => {
    expect(codepointWidth(0x41)).toBe(1) // 'A'
    expect(codepointWidth(0x7e)).toBe(1) // '~'
  })

  it('C0 controls = 0', () => {
    expect(codepointWidth(0x00)).toBe(0)
    expect(codepointWidth(0x07)).toBe(0) // BEL
    expect(codepointWidth(0x1b)).toBe(0) // ESC
  })

  it('tab/LF/CR = 0', () => {
    expect(codepointWidth(0x09)).toBe(0)
    expect(codepointWidth(0x0a)).toBe(0)
    expect(codepointWidth(0x0d)).toBe(0)
  })

  it('CJK ideographs = 2', () => {
    expect(codepointWidth(0x4e2d)).toBe(2) // 中
    expect(codepointWidth(0x6587)).toBe(2) // 文
  })

  it('Hiragana = 2', () => {
    expect(codepointWidth(0x3042)).toBe(2) // あ
  })

  it('Hangul syllables = 2', () => {
    expect(codepointWidth(0xac00)).toBe(2) // 가
  })

  it('Fullwidth ASCII = 2', () => {
    expect(codepointWidth(0xff21)).toBe(2) // Ａ
  })

  it('Emoji = 2', () => {
    expect(codepointWidth(0x1f600)).toBe(2) // 😀
    expect(codepointWidth(0x1f680)).toBe(2) // 🚀
  })

  it('Combining marks = 0', () => {
    expect(codepointWidth(0x0301)).toBe(0) // combining acute
    expect(codepointWidth(0x0303)).toBe(0) // combining tilde
  })

  it('Zero-width joiner = 0', () => {
    expect(codepointWidth(0x200d)).toBe(0)
  })

  it('Variation selectors = 0', () => {
    expect(codepointWidth(0xfe0f)).toBe(0)
  })

  it('CJK Extension B = 2', () => {
    expect(codepointWidth(0x20000)).toBe(2)
  })
})

describe('width', () => {
  it('empty string is 0', () => {
    expect(width('')).toBe(0)
  })

  it('ASCII is 1 per char', () => {
    expect(width('hello')).toBe(5)
  })

  it('CJK is 2 per char', () => {
    expect(width('中文')).toBe(4)
    expect(width('日本語')).toBe(6)
  })

  it('mixed ASCII + CJK', () => {
    expect(width('Hi 中')).toBe(5)
  })

  it('strips ANSI before measuring', () => {
    expect(width('\x1b[31mred\x1b[39m')).toBe(3)
    expect(width('\x1b[1m\x1b[31mhi\x1b[39m\x1b[22m')).toBe(2)
  })

  it('combining marks add 0', () => {
    expect(width('é')).toBeGreaterThan(0) // precomposed
    expect(width('é')).toBe(1) // decomposed
  })

  it('emoji = 2', () => {
    expect(width('😀')).toBe(2)
    expect(width('🚀')).toBe(2)
  })

  it('emoji ZWJ sequences = 2 (single grapheme)', () => {
    // 👨‍👩‍👧 — man + ZWJ + woman + ZWJ + girl, one grapheme cluster
    expect(width('👨‍👩‍👧')).toBe(2)
  })

  it('variation selectors do not add width', () => {
    // ❤️ — U+2764 U+FE0F (text → emoji)
    expect(width('❤️')).toBeGreaterThan(0)
  })
})

describe('width: fuzz', () => {
  it('never returns negative', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (s) => {
        expect(width(s)).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 500 },
    )
  })

  it('width(strip-only-ASCII) === ASCII length minus controls', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 64 }), (s) => {
        // For pure-ASCII printable strings, width === length
        const ascii = s.replace(/[^\x20-\x7e]/g, '')
        expect(width(ascii)).toBe(ascii.length)
      }),
      { numRuns: 200 },
    )
  })
})
