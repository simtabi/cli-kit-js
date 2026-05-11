import { describe, expect, it } from 'vitest'
import { progressBar } from '../src/index'

describe('progressBar', () => {
  it('0% bar', () => {
    const out = progressBar(0, 100, { width: 10 })
    expect(out).toMatch(/^\[░{10}\]/)
    expect(out).toContain('0%')
  })

  it('100% bar', () => {
    const out = progressBar(100, 100, { width: 10 })
    expect(out).toContain('100%')
    expect(out).toMatch(/^\[█{10}\]/)
  })

  it('50% bar', () => {
    const out = progressBar(50, 100, { width: 10 })
    expect(out).toContain('50%')
    expect(out).toMatch(/^\[█{5}░{5}\]/)
  })

  it('label prefixes', () => {
    expect(progressBar(50, 100, { width: 10, label: 'Loading' })).toMatch(/^Loading /)
  })

  it('handles 0 total', () => {
    expect(progressBar(0, 0, { width: 10 })).toContain('0%')
  })

  it('clamps overflow', () => {
    expect(progressBar(200, 100, { width: 10 })).toContain('100%')
  })

  it('hidden percent', () => {
    const out = progressBar(50, 100, { width: 10, showPercent: false })
    expect(out).not.toMatch(/%/)
  })
})
