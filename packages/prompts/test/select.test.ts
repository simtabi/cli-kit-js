import { answer, MemoryAdapter } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { select } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

const opts = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

describe('select prompt', () => {
  it('Enter selects the initial cursor', async () => {
    const io = tty()
    answer(io, 'enter')
    expect(await select({ io, message: 'choose', options: opts })).toBe('a')
  })

  it('arrow down moves cursor and Enter selects', async () => {
    const io = tty()
    answer(io, { name: 'down' }, 'enter')
    expect(await select({ io, message: 'choose', options: opts })).toBe('b')
  })

  it('arrow up wraps to last option', async () => {
    const io = tty()
    answer(io, { name: 'up' }, 'enter')
    expect(await select({ io, message: 'choose', options: opts })).toBe('c')
  })

  it('initial cursor position', async () => {
    const io = tty()
    answer(io, 'enter')
    expect(await select({ io, message: 'choose', options: opts, initial: 2 })).toBe('c')
  })

  it('skips disabled options', async () => {
    const io = tty()
    answer(io, { name: 'down' }, 'enter')
    const o = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ]
    expect(await select({ io, message: 'choose', options: o })).toBe('c')
  })

  it('vim-style j/k navigation', async () => {
    const io = tty()
    answer(io, { name: 'j' }, { name: 'j' }, 'enter')
    expect(await select({ io, message: 'choose', options: opts })).toBe('c')
  })

  it('non-TTY: numbered prompt', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, '2')
    expect(await select({ io, message: 'choose', options: opts })).toBe('b')
  })
})
