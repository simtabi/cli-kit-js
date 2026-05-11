import { MemoryAdapter } from '@simtabi/cli-kit-js-io'
import { describe, expect, it } from 'vitest'
import { defineCommand, run } from '../src/index'

function harness(): { io: MemoryAdapter; signal: AbortSignal; ac: AbortController; opts: import('../src/index').RunOptions } {
  const io = new MemoryAdapter()
  const ac = new AbortController()
  return {
    io,
    signal: ac.signal,
    ac,
    opts: { io, signal: ac.signal, exit: false, installSignalsAndGuard: false },
  }
}

describe('run: basics', () => {
  it('invokes the run function with parsed args', async () => {
    const seen: unknown[] = []
    const cmd = defineCommand({
      meta: { name: 'hi' },
      args: { name: { type: 'string', default: 'World' } },
      run: (ctx) => {
        seen.push(ctx.args.name)
      },
    })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: ['--name', 'Claude'] })
    expect(r.type).toBe('ok')
    expect(seen).toEqual(['Claude'])
  })

  it('returns ok with result value', async () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      run: () => 42,
    })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: [] })
    expect(r).toMatchObject({ type: 'ok', code: 0, result: 42 })
  })

  it('awaits async run', async () => {
    let touched = false
    const cmd = defineCommand({
      meta: { name: 'x' },
      run: async () => {
        await new Promise((r) => setTimeout(r, 5))
        touched = true
      },
    })
    const h = harness()
    await run(cmd, { ...h.opts, argv: [] })
    expect(touched).toBe(true)
  })
})

describe('run: --help', () => {
  it('emits help text and returns code 0', async () => {
    const cmd = defineCommand({
      meta: { name: 'hi', description: 'sample' },
      run: () => 'never',
    })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: ['--help'] })
    expect(r.type).toBe('help')
    expect(h.io.stdout).toContain('hi')
  })

  it('emits JSON help on --help=json', async () => {
    const cmd = defineCommand({ meta: { name: 'hi' }, run: () => 'x' })
    const h = harness()
    await run(cmd, { ...h.opts, argv: ['--help=json'] })
    expect(() => JSON.parse(h.io.stdout)).not.toThrow()
  })
})

describe('run: --version', () => {
  it('prints version and returns 0', async () => {
    const cmd = defineCommand({ meta: { name: 'x', version: '9.9.9' }, run: () => 'x' })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: ['--version'] })
    expect(r.type).toBe('version')
    expect(h.io.stdout).toContain('9.9.9')
  })
})

describe('run: usage errors', () => {
  it('returns usage-error on bad parse', async () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      args: { n: { type: 'integer' } },
      run: () => 'x',
    })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: ['--n', 'abc'] })
    expect(r.type).toBe('usage-error')
    expect(r.code).toBe(2)
    expect(h.io.stderr).toContain('not an integer')
  })

  it('suggests did-you-mean on unknown flag', async () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      args: { verbose: { type: 'boolean' } },
      run: () => 'x',
    })
    const h = harness()
    await run(cmd, { ...h.opts, argv: ['--verboes'] })
    expect(h.io.stderr).toContain('Did you mean')
    expect(h.io.stderr).toContain('--verbose')
  })
})

describe('run: subcommands', () => {
  const child = defineCommand({
    meta: { name: 'build', description: 'Build it' },
    args: { input: { type: 'positional', required: true } },
    run: ({ args }) => `built ${args.input}`,
  })
  const parent = defineCommand({
    meta: { name: 'tool' },
    subCommands: { build: child },
  })

  it('routes into a subcommand', async () => {
    const h = harness()
    const r = await run(parent, { ...h.opts, argv: ['build', 'src/'] })
    expect(r).toMatchObject({ type: 'ok', result: 'built src/' })
  })

  it('routes --help into a subcommand context', async () => {
    const h = harness()
    await run(parent, { ...h.opts, argv: ['build', '--help'] })
    expect(h.io.stdout).toContain('build')
  })

  it('unknown subcommand → usage-error with suggestion', async () => {
    const h = harness()
    const r = await run(parent, { ...h.opts, argv: ['bulid'] })
    expect(r.type).toBe('usage-error')
    expect(h.io.stderr).toContain('Did you mean')
    expect(h.io.stderr).toContain('build')
  })
})

describe('run: lifecycle', () => {
  it('calls setup → run → cleanup in order', async () => {
    const order: string[] = []
    const cmd = defineCommand({
      meta: { name: 'x' },
      setup: () => {
        order.push('setup')
      },
      run: () => {
        order.push('run')
        return 'r'
      },
      cleanup: ({ result }) => {
        order.push(`cleanup:${String(result)}`)
      },
    })
    const h = harness()
    await run(cmd, { ...h.opts, argv: [] })
    expect(order).toEqual(['setup', 'run', 'cleanup:r'])
  })

  it('cleanup runs even on thrown run', async () => {
    let cleaned = false
    const cmd = defineCommand({
      meta: { name: 'x' },
      run: () => {
        throw new Error('boom')
      },
      cleanup: ({ error }) => {
        cleaned = error instanceof Error && error.message === 'boom'
      },
    })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: [] })
    expect(cleaned).toBe(true)
    expect(r.type).toBe('runtime-error')
    expect(h.io.stderr).toContain('boom')
  })

  it('respects AbortSignal between setup and run', async () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      setup: ({ signal }) => {
        // Signal already aborted before setup completes? Schedule abort during setup.
        ;(signal as AbortSignal & { dispatchEvent: (e: Event) => boolean }) // noop
      },
      run: () => 'should not run',
    })
    const h = harness()
    h.ac.abort(new Error('signal SIGINT'))
    const r = await run(cmd, { ...h.opts, argv: [] })
    expect(r.type).toBe('cancelled')
    expect(r.code).toBe(130)
  })
})

describe('run: hooks', () => {
  it('fires before:run and after:run', async () => {
    const fired: string[] = []
    const cmd = defineCommand({
      meta: { name: 'x' },
      run: () => 'r',
      plugins: [
        {
          name: 'tracer',
          hooks: {
            'before:run': () => {
              fired.push('before:run')
            },
            'after:run': () => {
              fired.push('after:run')
            },
            'on:exit': ({ code }) => {
              fired.push(`exit:${code}`)
            },
          },
        },
      ],
    })
    const h = harness()
    await run(cmd, { ...h.opts, argv: [] })
    expect(fired).toEqual(['before:run', 'after:run', 'exit:0'])
  })

  it('a plugin throw does not abort the run (non-strict)', async () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      run: () => 'r',
      plugins: [
        {
          name: 'bad',
          hooks: {
            'before:run': () => {
              throw new Error('plugin boom')
            },
          },
        },
      ],
    })
    const h = harness()
    const r = await run(cmd, { ...h.opts, argv: [] })
    expect(r.type).toBe('ok')
    expect(h.io.stderr).toContain('plugin boom')
  })
})

describe('run: lazy subcommands', () => {
  it('loads a lazy subcommand on demand', async () => {
    const lazy = defineCommand({
      meta: { name: 'lazy' },
      run: () => 'loaded',
    })
    const parent = defineCommand({
      meta: { name: 'p' },
      subCommands: { lazy: () => Promise.resolve(lazy) },
    })
    const h = harness()
    const r = await run(parent, { ...h.opts, argv: ['lazy'] })
    expect(r).toMatchObject({ type: 'ok', result: 'loaded' })
  })

  it('supports `{ default: Command }` returns (ESM import shape)', async () => {
    const lazy = defineCommand({
      meta: { name: 'lazy' },
      run: () => 'default-shape',
    })
    const parent = defineCommand({
      meta: { name: 'p' },
      subCommands: { lazy: () => Promise.resolve({ default: lazy }) },
    })
    const h = harness()
    const r = await run(parent, { ...h.opts, argv: ['lazy'] })
    expect(r).toMatchObject({ type: 'ok', result: 'default-shape' })
  })
})
