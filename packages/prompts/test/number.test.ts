import { MemoryAdapter, answer } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { number, PromptCancelledError } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

describe('number prompt', () => {
  it('parses digits and Enter accepts', async () => {
    const io = tty()
    answer(io, { name: '4', raw: '4' }, { name: '2', raw: '2' }, 'enter')
    expect(await number({ io, message: 'n?' })).toBe(42)
  })

  it('rejects non-numeric characters silently', async () => {
    const io = tty()
    answer(io, { name: '1', raw: '1' }, { name: 'a', raw: 'a' }, { name: '2', raw: '2' }, 'enter')
    expect(await number({ io, message: 'n?' })).toBe(12)
  })

  it('accepts negative numbers when first char is "-"', async () => {
    const io = tty()
    answer(io, { name: '-', raw: '-' }, { name: '5', raw: '5' }, 'enter')
    expect(await number({ io, message: 'n?' })).toBe(-5)
  })

  it('arrow up increments by step', async () => {
    const io = tty()
    answer(io, { name: 'up' }, { name: 'up' }, 'enter')
    expect(await number({ io, message: 'n?', default: 10, step: 5 })).toBe(20)
  })

  it('arrow down decrements by step', async () => {
    const io = tty()
    answer(io, { name: 'down' }, 'enter')
    expect(await number({ io, message: 'n?', default: 10 })).toBe(9)
  })

  it('clamps to min on Up arrow', async () => {
    const io = tty()
    answer(io, { name: 'up' }, { name: 'up' }, 'enter')
    expect(await number({ io, message: 'n?', default: 4, max: 5 })).toBe(5)
  })

  it('clamps to max on Down arrow', async () => {
    const io = tty()
    answer(io, { name: 'down' }, 'enter')
    expect(await number({ io, message: 'n?', default: 2, min: 1 })).toBe(1)
  })

  it('rejects out-of-range Enter and re-prompts', async () => {
    const io = tty()
    answer(io,
      { name: '1', raw: '1' },
      'enter', // 1 < min 5 → error
      { name: '0', raw: '0' },
      'enter', // 10 OK
    )
    expect(await number({ io, message: 'n?', min: 5 })).toBe(10)
  })

  it('integer mode rejects decimal point', async () => {
    const io = tty()
    answer(io, { name: '5', raw: '5' }, { name: '.', raw: '.' }, { name: '7', raw: '7' }, 'enter')
    expect(await number({ io, message: 'n?', integer: true })).toBe(57)
  })

  it('Escape cancels', async () => {
    const io = tty()
    answer(io, 'escape')
    await expect(number({ io, message: 'n?' })).rejects.toBeInstanceOf(PromptCancelledError)
  })

  it('non-TTY: reads line', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, '99')
    expect(await number({ io, message: 'n?' })).toBe(99)
  })

  it('non-TTY rejects bad input', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, 'abc')
    await expect(number({ io, message: 'n?' })).rejects.toThrow(/not a number/)
  })
})
