import { MemoryAdapter, answer } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { PromptCancelledError, text } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

describe('text prompt: TTY', () => {
  it('accepts typed input and returns on Enter', async () => {
    const io = tty()
    answer(io, 'h', 'i', 'enter')
    const result = await text({ io, message: 'name?' })
    expect(result).toBe('hi')
  })

  it('returns default when buffer is empty', async () => {
    const io = tty()
    answer(io, 'enter')
    const result = await text({ io, message: 'name?', default: 'World' })
    expect(result).toBe('World')
  })

  it('handles backspace', async () => {
    const io = tty()
    answer(io, 'h', 'i', { name: 'backspace' }, 'o', 'enter')
    const result = await text({ io, message: 'name?' })
    expect(result).toBe('ho')
  })

  it('Ctrl+C cancels with PromptCancelledError', async () => {
    const io = tty()
    answer(io, { name: 'c', ctrl: true })
    await expect(text({ io, message: 'name?' })).rejects.toBeInstanceOf(PromptCancelledError)
  })

  it('validate keeps prompt open on failure', async () => {
    const io = tty()
    // First Enter triggers validation (empty fails), then type "ok" + Enter
    answer(io, 'enter', 'o', 'k', 'enter')
    const result = await text({
      io,
      message: 'name?',
      validate: (v) => (v.length === 0 ? 'required' : true),
    })
    expect(result).toBe('ok')
  })

  it('writes the message to stdout', async () => {
    const io = tty()
    answer(io, 'enter')
    await text({ io, message: 'name?', default: 'x' })
    // Raw writes contain the prompt
    expect(io.rawWrites.some((w) => w.includes('name?'))).toBe(true)
  })
})

describe('text prompt: non-TTY', () => {
  it('reads a single line via readLine', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, 'piped value')
    const result = await text({ io, message: 'name?' })
    expect(result).toBe('piped value')
  })

  it('uses default on empty piped input', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, '')
    const result = await text({ io, message: 'name?', default: 'fallback' })
    expect(result).toBe('fallback')
  })
})
