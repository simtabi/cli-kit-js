import { answer, MemoryAdapter } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { PromptCancelledError, select, text, wizard } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

interface State {
  readonly name: string
  readonly kind: 'web' | 'cli'
}

describe('wizard', () => {
  it('runs steps in order and returns aggregated state', async () => {
    const io = tty()
    answer(
      io,
      // text: my-app
      { name: 'm', raw: 'm' },
      { name: 'y', raw: 'y' },
      'enter',
      // select: web
      'enter',
    )
    const result = await wizard<State>({
      io,
      steps: [
        {
          id: 'name',
          prompt: ({ io }) => text({ io, message: 'name?' }),
        },
        {
          id: 'kind',
          prompt: ({ io }) =>
            select<'web' | 'cli'>({
              io,
              message: 'kind?',
              options: [
                { value: 'web', label: 'Web' },
                { value: 'cli', label: 'CLI' },
              ],
            }),
        },
      ],
    })
    expect(result.name).toBe('my')
    expect(result.kind).toBe('web')
  })

  it('when() skips steps', async () => {
    const io = tty()
    answer(
      io,
      // select kind: cli (down + enter)
      { name: 'down' },
      'enter',
      // text name
      { name: 'a', raw: 'a' },
      'enter',
    )
    const result = await wizard<State>({
      io,
      steps: [
        {
          id: 'kind',
          prompt: ({ io }) =>
            select<'web' | 'cli'>({
              io,
              message: 'kind?',
              options: [
                { value: 'web', label: 'Web' },
                { value: 'cli', label: 'CLI' },
              ],
            }),
        },
        {
          id: 'framework',
          when: (s) => s.kind === 'web',
          prompt: ({ io }) => text({ io, message: 'framework?' }),
        },
        {
          id: 'name',
          prompt: ({ io }) => text({ io, message: 'name?' }),
        },
      ],
    })
    expect(result.kind).toBe('cli')
    expect(result.framework).toBeUndefined()
    expect(result.name).toBe('a')
  })

  it('next() jumps to specific step', async () => {
    const io = tty()
    answer(io, { name: 'a', raw: 'a' }, 'enter', { name: 'c', raw: 'c' }, 'enter')
    const result = await wizard({
      io,
      steps: [
        {
          id: 'first',
          prompt: ({ io }) => text({ io, message: '1?' }),
          next: () => 'third',
        },
        {
          id: 'second',
          prompt: ({ io }) => text({ io, message: 'NEVER' }),
        },
        {
          id: 'third',
          prompt: ({ io }) => text({ io, message: '3?' }),
        },
      ],
    })
    expect(result.first).toBe('a')
    expect(result.second).toBeUndefined()
    expect(result.third).toBe('c')
  })

  it('next() returning false ends the wizard', async () => {
    const io = tty()
    answer(io, { name: 'a', raw: 'a' }, 'enter')
    const result = await wizard({
      io,
      steps: [
        {
          id: 'first',
          prompt: ({ io }) => text({ io, message: '1?' }),
          next: () => false,
        },
        {
          id: 'second',
          prompt: ({ io }) => text({ io, message: 'NEVER' }),
        },
      ],
    })
    expect(result.first).toBe('a')
    expect(result.second).toBeUndefined()
  })

  it('onComplete is called with final state', async () => {
    const io = tty()
    answer(io, { name: 'a', raw: 'a' }, 'enter')
    let captured: Record<string, unknown> | null = null
    await wizard({
      io,
      steps: [{ id: 'name', prompt: ({ io }) => text({ io, message: 'n?' }) }],
      onComplete: (s) => {
        captured = s as Record<string, unknown>
      },
    })
    expect(captured).not.toBeNull()
    expect((captured as unknown as { name: string }).name).toBe('a')
  })

  it('cancel bubbles when step is not back-able', async () => {
    const io = tty()
    answer(io, 'escape')
    await expect(
      wizard({
        io,
        steps: [{ id: 'name', prompt: ({ io }) => text({ io, message: 'n?' }) }],
      }),
    ).rejects.toBeInstanceOf(PromptCancelledError)
  })

  it('empty steps array throws', async () => {
    const io = tty()
    await expect(wizard({ io, steps: [] })).rejects.toThrow(/at least one step/)
  })

  it('unknown next() id throws', async () => {
    const io = tty()
    answer(io, { name: 'a', raw: 'a' }, 'enter')
    await expect(
      wizard({
        io,
        steps: [
          {
            id: 'first',
            prompt: ({ io }) => text({ io, message: '1?' }),
            next: () => 'nope',
          },
        ],
      }),
    ).rejects.toThrow(/unknown step id/)
  })
})
