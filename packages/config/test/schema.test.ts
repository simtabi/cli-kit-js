import { describe, expect, it } from 'vitest'
import {
  defineSchema,
  findFieldDef,
  getDefaults,
  walkSchema,
} from '../src/index'

describe('defineSchema', () => {
  it('is identity (preserves type)', () => {
    const s = defineSchema({
      a: { type: 'string', default: 'x' },
    })
    expect(s.a).toEqual({ type: 'string', default: 'x' })
  })
})

describe('walkSchema', () => {
  it('visits leaves with dot-paths', () => {
    const s = defineSchema({
      server: {
        port: { type: 'integer', default: 3000 },
        host: { type: 'string', default: 'localhost' },
      },
      output: {
        color: { type: 'enum', values: ['auto', 'never'], default: 'auto' },
      },
    })
    const paths: string[] = []
    walkSchema(s, (p) => paths.push(p))
    expect(paths.sort()).toEqual(['output.color', 'server.host', 'server.port'])
  })
})

describe('getDefaults', () => {
  it('builds defaults tree', () => {
    const s = defineSchema({
      a: { type: 'integer', default: 1 },
      nested: {
        b: { type: 'string', default: 'hi' },
      },
    })
    const d = getDefaults(s) as Record<string, unknown>
    expect(d.a).toBe(1)
    expect((d.nested as Record<string, unknown>).b).toBe('hi')
  })

  it('omits fields without defaults', () => {
    const s = defineSchema({
      a: { type: 'string' },
    })
    expect(getDefaults(s)).toEqual({})
  })
})

describe('findFieldDef', () => {
  it('returns the leaf def', () => {
    const s = defineSchema({
      x: { y: { type: 'integer', default: 1 } },
    })
    expect(findFieldDef(s, 'x.y')?.type).toBe('integer')
  })

  it('returns null for non-leaf', () => {
    const s = defineSchema({
      x: { y: { type: 'integer' } },
    })
    expect(findFieldDef(s, 'x')).toBeNull()
  })

  it('returns null for unknown path', () => {
    const s = defineSchema({ x: { type: 'string' } })
    expect(findFieldDef(s, 'nope.nada')).toBeNull()
  })
})
