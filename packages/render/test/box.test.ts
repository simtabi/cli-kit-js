import { describe, expect, it } from 'vitest'
import { box } from '../src/index'

describe('box', () => {
  it('renders a single-line single-style box', () => {
    const out = box('hi')
    expect(out).toBe(['┌────┐', '│ hi │', '└────┘'].join('\n'))
  })

  it('round style uses curved corners', () => {
    const out = box('hi', { style: 'round' })
    expect(out).toContain('╭')
    expect(out).toContain('╮')
    expect(out).toContain('╰')
    expect(out).toContain('╯')
  })

  it('double style', () => {
    const out = box('hi', { style: 'double' })
    expect(out).toContain('╔')
    expect(out).toContain('═')
    expect(out).toContain('╝')
  })

  it('ascii style', () => {
    const out = box('hi', { style: 'ascii' })
    expect(out).toContain('+')
    expect(out).toContain('-')
    expect(out).toContain('|')
  })

  it('vertical padding adds blank rows inside the box', () => {
    const out = box('hi', { padding: { x: 1, y: 1 } })
    const lines = out.split('\n')
    expect(lines.length).toBe(5)
    expect(lines[1]?.trim().startsWith('│')).toBe(true) // blank padded row
  })

  it('wraps content to opts.width', () => {
    const long = 'one two three four five six seven eight nine ten'
    const out = box(long, { width: 16, padding: { x: 1, y: 0 } })
    for (const line of out.split('\n')) {
      // interior content width never exceeds 16-2=14 plus the borders
      expect(line.length).toBeLessThanOrEqual(20)
    }
  })

  it('multi-line input keeps right edge aligned', () => {
    const out = box('one\ntwo\nlonger line')
    const lines = out.split('\n')
    const lengths = new Set(lines.map((l) => l.length))
    expect(lengths.size).toBe(1)
  })

  it('renders title on top border', () => {
    const out = box('content', { title: 'TITLE' })
    expect(out.split('\n')[0]).toContain('TITLE')
  })

  it('handles CJK width', async () => {
    // Each CJK character is 1 code unit but 2 columns. Compare visible
    // *width* across lines, not string length.
    const { width } = await import('@simtabi/cli-kit-js-text')
    const out = box('日本')
    const lines = out.split('\n')
    const widths = new Set(lines.map((l) => width(l)))
    expect(widths.size).toBe(1)
  })
})
