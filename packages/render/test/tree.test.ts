import { describe, expect, it } from 'vitest'
import { tree } from '../src/index'

describe('tree', () => {
  it('renders a flat tree', () => {
    const out = tree({
      label: 'root',
      children: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
    })
    expect(out).toBe(['root', '├── a', '├── b', '└── c'].join('\n'))
  })

  it('uses ascii fallback', () => {
    const out = tree(
      { label: 'r', children: [{ label: 'x' }] },
      { ascii: true },
    )
    expect(out).toContain('+--')
    expect(out).not.toContain('├')
  })

  it('renders nested tree with continuation pipes', () => {
    const out = tree({
      label: 'root',
      children: [
        { label: 'a', children: [{ label: 'a1' }, { label: 'a2' }] },
        { label: 'b' },
      ],
    })
    expect(out).toContain('│   ├── a1')
    expect(out).toContain('│   └── a2')
    expect(out).toContain('└── b')
  })

  it('lone root has no children section', () => {
    expect(tree({ label: 'solo' })).toBe('solo')
  })
})
