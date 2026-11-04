import { answer, MemoryAdapter } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { multiselect } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

const opts = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

describe('multiselect prompt', () => {
  it('Space toggles current cursor; Enter confirms', async () => {
    const io = tty()
    answer(io, ' ', { name: 'down' }, ' ', 'enter')
    const r = await multiselect({ io, message: 'pick', options: opts })
    expect(r).toEqual(['a', 'b'])
  })

  it('Enter with empty selection returns []', async () => {
    const io = tty()
    answer(io, 'enter')
    expect(await multiselect({ io, message: 'pick', options: opts })).toEqual([])
  })

  it('respects initialSelected', async () => {
    const io = tty()
    answer(io, 'enter')
    const r = await multiselect({
      io,
      message: 'pick',
      options: opts,
      initialSelected: ['b'],
    })
    expect(r).toEqual(['b'])
  })

  it('minSelected enforced', async () => {
    const io = tty()
    // First Enter rejected (0 selected, min=1), then space (selects a), Enter accepts.
    answer(io, 'enter', ' ', 'enter')
    const r = await multiselect({
      io,
      message: 'pick',
      options: opts,
      minSelected: 1,
    })
    expect(r).toEqual(['a'])
  })

  it('non-TTY: comma-separated input', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, '1, 3')
    const r = await multiselect({ io, message: 'pick', options: opts })
    expect(r).toEqual(['a', 'c'])
  })

  it('non-TTY: empty line returns []', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, '')
    expect(await multiselect({ io, message: 'pick', options: opts })).toEqual([])
  })
})
