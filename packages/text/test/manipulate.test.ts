import { describe, expect, it } from 'vitest'
import { align, pad, truncate, width, wrap } from '../src/index'

describe('truncate', () => {
  it('returns input unchanged when shorter than columns', () => {
    expect(truncate('hi', 10)).toBe('hi')
  })

  it('truncates with default ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…')
  })

  it('truncates with custom ellipsis', () => {
    expect(truncate('hello world', 8, { ellipsis: '...' })).toBe('hello...')
  })

  it('truncates CJK by column, not codepoint', () => {
    expect(truncate('日本語のテスト', 6)).toBe('日本…')
  })

  it('position: start', () => {
    expect(truncate('abcdefghij', 5, { position: 'start' })).toBe('…ghij')
  })

  it('position: middle', () => {
    expect(truncate('abcdefghij', 7, { position: 'middle' })).toBe('abc…hij')
  })

  it('returns empty for columns <= 0', () => {
    expect(truncate('hello', 0)).toBe('')
    expect(truncate('hello', -1)).toBe('')
  })

  it('handles ellipsis wider than budget', () => {
    expect(truncate('hello', 1, { ellipsis: '…' })).toBe('h')
  })
})

describe('pad', () => {
  it('pads right by default', () => {
    expect(pad('hi', 5)).toBe('hi   ')
  })

  it('pads left', () => {
    expect(pad('hi', 5, 'left')).toBe('   hi')
  })

  it('pads center', () => {
    expect(pad('hi', 6, 'center')).toBe('  hi  ')
  })

  it('returns unchanged when already wide enough', () => {
    expect(pad('hello', 3)).toBe('hello')
  })

  it('pads with custom char', () => {
    expect(pad('5', 4, 'left', '0')).toBe('0005')
  })

  it('respects CJK columns', () => {
    // '中' = 2 columns; padding to 5 needs 3 spaces
    expect(pad('中', 5)).toBe('中   ')
  })
})

describe('wrap', () => {
  it('returns single line unchanged when within columns', () => {
    expect(wrap('hello world', 20)).toBe('hello world')
  })

  it('wraps on whitespace', () => {
    expect(wrap('hello world foo', 5)).toBe('hello\n world\n foo')
  })

  it('breaks long words by default (hard=true)', () => {
    const out = wrap('supercalifragilistic', 5)
    expect(out.split('\n').every((l) => width(l) <= 5)).toBe(true)
  })

  it('preserves explicit newlines', () => {
    const out = wrap('a\nb\nc', 10)
    expect(out).toBe('a\nb\nc')
  })

  it('hard=false allows overflow on impossible words', () => {
    const out = wrap('foo verylongwordhere bar', 5, { hard: false })
    expect(out.includes('verylongwordhere')).toBe(true)
  })
})

describe('align', () => {
  it('aligns lines to width', () => {
    const out = align(['a', 'bb', 'ccc'], 5, 'left')
    expect(out).toEqual(['a    ', 'bb   ', 'ccc  '])
  })

  it('center-aligns', () => {
    const out = align(['a', 'bb'], 5, 'center')
    expect(out[0]).toBe('  a  ')
  })
})
