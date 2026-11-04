import { answer, MemoryAdapter } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { autocomplete, PromptCancelledError } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

const opts = [
  { value: 'us-west-1', label: 'us-west-1' },
  { value: 'us-west-2', label: 'us-west-2' },
  { value: 'us-east-1', label: 'us-east-1' },
  { value: 'eu-west-1', label: 'eu-west-1' },
]

// Settle a microtask so the autocomplete's initial async source resolution
// completes before the next key is dequeued.
const tick = () => new Promise<void>((r) => setTimeout(r, 0))

describe('autocomplete prompt', () => {
  it('Enter picks the first match with no query', async () => {
    const io = tty()
    answer(io, 'enter')
    expect(await autocomplete({ io, message: 'r?', source: opts })).toBe('us-west-1')
  })

  it('filters by substring as the user types', async () => {
    const io = tty()
    answer(io, { name: 'e', raw: 'e' }, { name: 'a', raw: 'a' }, 'enter')
    expect(await autocomplete({ io, message: 'r?', source: opts })).toBe('us-east-1')
  })

  it('arrow down moves through filtered list', async () => {
    const io = tty()
    answer(io, { name: 'w', raw: 'w' }, { name: 'down' }, 'enter')
    expect(await autocomplete({ io, message: 'r?', source: opts })).toBe('us-west-2')
  })

  it('Escape cancels', async () => {
    const io = tty()
    answer(io, 'escape')
    await expect(autocomplete({ io, message: 'r?', source: opts })).rejects.toBeInstanceOf(
      PromptCancelledError,
    )
  })

  it('async source: filtered by query', async () => {
    const io = tty()
    answer(io, { name: 'e', raw: 'e' }, 'enter')
    const source = async (q: string) => {
      const items = opts.filter((o) => o.label.includes(q))
      return items
    }
    const v = await autocomplete({ io, message: 'r?', source })
    expect(v).toBe('us-west-1')
    // The first result after filtering for "e" is `us-west-1` since it contains "e".
    await tick()
  })

  it('non-TTY: numeric pick', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, '3')
    expect(await autocomplete({ io, message: 'r?', source: opts })).toBe('us-east-1')
  })
})
