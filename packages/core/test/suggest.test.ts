import { describe, expect, it } from 'vitest'
import { suggest } from '../src/index'

describe('suggest', () => {
  it('finds the closest candidate', () => {
    const out = suggest('buld', ['build', 'test', 'deploy'])
    expect(out).toEqual(['build'])
  })

  it('returns multiple within threshold', () => {
    const out = suggest('bild', ['build', 'bind', 'unrelated'])
    expect(out.length).toBeGreaterThanOrEqual(1)
    expect(out).toContain('build')
  })

  it('rejects wild guesses outside threshold', () => {
    const out = suggest('build', ['xylophone'])
    expect(out).toEqual([])
  })

  it('returns empty for empty input', () => {
    expect(suggest('', ['build'])).toEqual([])
  })

  it('returns empty for empty candidates', () => {
    expect(suggest('build', [])).toEqual([])
  })

  it('caps result count', () => {
    const out = suggest('bul', ['bud', 'bul', 'but', 'bus', 'bun'], 2)
    expect(out.length).toBeLessThanOrEqual(2)
  })

  it('exact match returns itself', () => {
    expect(suggest('build', ['build', 'test'])).toEqual(['build'])
  })
})
