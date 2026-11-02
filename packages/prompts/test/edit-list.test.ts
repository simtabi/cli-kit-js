import { MemoryAdapter, answer } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { PromptCancelledError, editList } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

describe('editList prompt', () => {
  it('builds an array, ends on empty Enter', async () => {
    const io = tty()
    answer(io, { name: 'a', raw: 'a' }, 'enter', { name: 'b', raw: 'b' }, 'enter', 'enter')
    expect(await editList({ io, message: 'tags' })).toEqual(['a', 'b'])
  })

  it('backspace at empty buffer pops the last item back into the buffer', async () => {
    const io = tty()
    answer(
      io,
      { name: 'a', raw: 'a' },
      'enter',
      'backspace',
      { name: 'b', raw: 'b' },
      'enter',
      'enter',
    )
    expect(await editList({ io, message: 'tags' })).toEqual(['ab'])
  })

  it('rejects finishing under min', async () => {
    const io = tty()
    answer(
      io,
      'enter', // empty → error (need ≥ 1)
      { name: 'a', raw: 'a' },
      'enter',
      'enter',
    )
    expect(await editList({ io, message: 'tags', min: 1 })).toEqual(['a'])
  })

  it('rejects adding past max', async () => {
    const io = tty()
    answer(
      io,
      { name: 'a', raw: 'a' },
      'enter', // add 'a' → items=['a']
      { name: 'b', raw: 'b' },
      'enter', // refused: at max
      'backspace', // clear 'b'
      'enter', // empty submit
    )
    expect(await editList({ io, message: 'tags', max: 1 })).toEqual(['a'])
  })

  it('validate rejects bad items', async () => {
    const io = tty()
    answer(
      io,
      { name: 'A', raw: 'A' },
      'enter', // uppercase → fail
      'backspace',
      { name: 'a', raw: 'a' },
      'enter',
      'enter',
    )
    const result = await editList({
      io,
      message: 'tags',
      validate: (v) => (/^[a-z]+$/.test(v) ? true : 'lowercase'),
    })
    expect(result).toEqual(['a'])
  })

  it('Escape cancels', async () => {
    const io = tty()
    answer(io, 'escape')
    await expect(editList({ io, message: 'tags' })).rejects.toBeInstanceOf(PromptCancelledError)
  })

  it('non-TTY: parses comma-separated', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, 'a, b , c')
    expect(await editList({ io, message: 'tags' })).toEqual(['a', 'b', 'c'])
  })
})
