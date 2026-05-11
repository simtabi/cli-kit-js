import { MemoryAdapter, answer } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { confirm } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

describe('confirm prompt', () => {
  it('y returns true', async () => {
    const io = tty()
    answer(io, 'y')
    expect(await confirm({ io, message: 'Continue?' })).toBe(true)
  })

  it('n returns false', async () => {
    const io = tty()
    answer(io, 'n')
    expect(await confirm({ io, message: 'Continue?' })).toBe(false)
  })

  it('Enter uses default true', async () => {
    const io = tty()
    answer(io, 'enter')
    expect(await confirm({ io, message: 'Continue?', default: true })).toBe(true)
  })

  it('Enter uses default false', async () => {
    const io = tty()
    answer(io, 'enter')
    expect(await confirm({ io, message: 'Continue?', default: false })).toBe(false)
  })

  it('ignores other keys until y/n/enter', async () => {
    const io = tty()
    answer(io, 'x', 'z', 'y')
    expect(await confirm({ io, message: '?', default: false })).toBe(true)
  })

  it('non-TTY: parses line', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, 'yes')
    expect(await confirm({ io, message: '?', default: false })).toBe(true)
  })

  it('uses ASCII glyphs when capabilities.unicode is false', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24, unicode: false })
    answer(io, 'y')
    await confirm({ io, message: 'Continue?' })
    const written = io.rawWrites.join('')
    // ASCII fallback for the arrow is '>'; Unicode '›' should not appear.
    expect(written).not.toContain('›')
    expect(written).toContain('>')
  })
})
