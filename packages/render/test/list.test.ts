import { describe, expect, it } from 'vitest'
import { list } from '../src/index'

describe('list', () => {
  it('renders bullet list', () => {
    expect(list(['a', 'b'])).toBe('• a\n• b')
  })

  it('renders ordered list', () => {
    expect(list(['a', 'b'], { ordered: true })).toBe('1. a\n2. b')
  })

  it('custom bullet', () => {
    expect(list(['a'], { bullet: '★' })).toBe('★ a')
  })

  it('nested items', () => {
    const out = list(['top', { text: 'parent', children: ['child1', 'child2'] }])
    expect(out).toContain('• top')
    expect(out).toContain('• parent')
    expect(out).toContain('  • child1')
    expect(out).toContain('  • child2')
  })

  it('respects indent', () => {
    const out = list([{ text: 'p', children: ['c'] }], { indent: 4 })
    expect(out).toContain('    • c')
  })
})
