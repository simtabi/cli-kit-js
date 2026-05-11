import { describe, expect, it } from 'vitest'
import { table } from '../src/index'

describe('table', () => {
  it('renders headers and rows', () => {
    const out = table(
      [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
      { headers: ['Name', 'Age'] },
    )
    expect(out).toContain('Name')
    expect(out).toContain('Age')
    expect(out).toContain('Alice')
    expect(out).toContain('30')
  })

  it('aligns columns to the widest cell', () => {
    const out = table([['short', 'much longer cell']])
    const lines = out.split('\n')
    // every line should share the same length
    const lens = new Set(lines.map((l) => l.length))
    expect(lens.size).toBe(1)
  })

  it('per-column align option', () => {
    const out = table(
      [
        ['a', '1'],
        ['bb', '22'],
      ],
      { headers: ['L', 'R'], align: ['left', 'right'] },
    )
    expect(out).toContain('R')
  })

  it('multi-line cells expand row height', () => {
    const out = table([['multi\nline', 'flat']], { headers: ['col1', 'col2'] })
    expect(out.split('\n').length).toBeGreaterThan(5)
  })

  it('maxCellWidth truncates with ellipsis', () => {
    // truncate(s, 5) caps the entire output (including the ellipsis) at 5
    // columns, so 'supercalifragilistic' becomes 'supe…' (4 chars + '…').
    const out = table([['supercalifragilistic', 'short']], { maxCellWidth: 5 })
    expect(out).toMatch(/supe…/)
  })

  it('uses border style', () => {
    const out = table([['x']], { border: 'double' })
    expect(out).toContain('╔')
    expect(out).toContain('╝')
  })

  it('empty rows gracefully', () => {
    expect(table([])).toBe('')
  })
})
