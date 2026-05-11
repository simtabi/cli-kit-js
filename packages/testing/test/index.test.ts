import { defineCommand, run } from '@simtabi/cli-kit-js-core'
import { describe, expect, it } from 'vitest'
import {
  MemoryAdapter,
  answer,
  expectExitCode,
  expectNoStdout,
  expectResultType,
  expectStderr,
  expectStdout,
  freezeTime,
  snapshotHelp,
  withEnv,
} from '../src/index'

describe('expect matchers', () => {
  it('expectStdout matches substring', () => {
    const io = new MemoryAdapter()
    io.write('hello world')
    expect(() => expectStdout(io, 'hello')).not.toThrow()
  })

  it('expectStdout matches regex', () => {
    const io = new MemoryAdapter()
    io.write('hello world')
    expect(() => expectStdout(io, /^hello/)).not.toThrow()
  })

  it('expectStdout throws on miss', () => {
    const io = new MemoryAdapter()
    io.write('xyz')
    expect(() => expectStdout(io, 'hello')).toThrow(/not found/)
  })

  it('expectNoStdout passes when absent', () => {
    const io = new MemoryAdapter()
    io.write('hello')
    expect(() => expectNoStdout(io, 'goodbye')).not.toThrow()
  })

  it('expectNoStdout throws when present', () => {
    const io = new MemoryAdapter()
    io.write('hello')
    expect(() => expectNoStdout(io, 'hello')).toThrow(/unexpectedly matched/)
  })

  it('expectStderr routes to stderr buffer', () => {
    const io = new MemoryAdapter()
    io.writeError('oops')
    expect(() => expectStderr(io, 'oops')).not.toThrow()
  })

  it('expectExitCode compares result.code', async () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      run: () => undefined,
    })
    const io = new MemoryAdapter()
    const r = await run(cmd, { io, exit: false, installSignalsAndGuard: false, argv: [] })
    expect(() => expectExitCode(r, 0)).not.toThrow()
    expect(() => expectExitCode(r, 1)).toThrow()
  })

  it('expectResultType compares result.type', async () => {
    const cmd = defineCommand({
      meta: { name: 'x', version: '1.0' },
      run: () => undefined,
    })
    const io = new MemoryAdapter()
    const r = await run(cmd, {
      io,
      exit: false,
      installSignalsAndGuard: false,
      argv: ['--version'],
    })
    expect(() => expectResultType(r, 'version')).not.toThrow()
    expect(() => expectResultType(r, 'ok')).toThrow()
  })
})

describe('answer', () => {
  it('queues keys for readKey', async () => {
    const io = new MemoryAdapter()
    answer(io, 'h', 'i', 'enter')
    const ac = new AbortController()
    expect((await io.readKey(ac.signal)).name).toBe('h')
    expect((await io.readKey(ac.signal)).name).toBe('i')
    expect((await io.readKey(ac.signal)).name).toBe('enter')
  })

  it('answer.text / answer.line queue a full readLine response', async () => {
    const io = new MemoryAdapter()
    answer.text(io, 'World')
    answer.line(io, 'Hello')
    const ac = new AbortController()
    expect(await io.readLine(ac.signal)).toBe('World')
    expect(await io.readLine(ac.signal)).toBe('Hello')
  })

  it('queues key objects with modifiers', async () => {
    const io = new MemoryAdapter()
    answer(io, { name: 'c', ctrl: true })
    const ac = new AbortController()
    const k = await io.readKey(ac.signal)
    expect(k.name).toBe('c')
    expect(k.ctrl).toBe(true)
  })
})

describe('snapshotHelp', () => {
  it('returns deterministic plain-text help', () => {
    const cmd = defineCommand({
      meta: { name: 'demo', description: 'A demo' },
      args: { name: { type: 'string', default: 'World' } },
      run: () => undefined,
    })
    const txt = snapshotHelp(cmd)
    expect(txt).toContain('demo')
    expect(txt).toContain('--name')
    // No ANSI sequences
    expect(txt).not.toMatch(/\x1b\[/)
  })

  it('supports JSON format', () => {
    const cmd = defineCommand({ meta: { name: 'x', version: '1.0' }, run: () => undefined })
    const j = snapshotHelp(cmd, 'json')
    expect(() => JSON.parse(j)).not.toThrow()
  })
})

describe('freezeTime', () => {
  it('pins Date.now during scope', () => {
    const guard = freezeTime('2026-01-01T00:00:00Z')
    try {
      expect(Date.now()).toBe(new Date('2026-01-01T00:00:00Z').getTime())
    } finally {
      guard.restore()
    }
    // After restore, Date.now is monotonic again
    expect(Date.now()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime())
  })
})

describe('withEnv', () => {
  it('overrides + restores env vars', async () => {
    process.env.PRIOR_TEST = 'prior'
    delete process.env.NEW_TEST
    await withEnv({ PRIOR_TEST: 'overridden', NEW_TEST: 'added' }, async () => {
      expect(process.env.PRIOR_TEST).toBe('overridden')
      expect(process.env.NEW_TEST).toBe('added')
    })
    expect(process.env.PRIOR_TEST).toBe('prior')
    expect(process.env.NEW_TEST).toBeUndefined()
  })

  it('removes a var when undefined is passed', async () => {
    process.env.WILL_DISAPPEAR = 'x'
    await withEnv({ WILL_DISAPPEAR: undefined }, async () => {
      expect(process.env.WILL_DISAPPEAR).toBeUndefined()
    })
    expect(process.env.WILL_DISAPPEAR).toBe('x')
    delete process.env.WILL_DISAPPEAR
  })

  it('restores even on thrown callback', async () => {
    process.env.RESTORE_ME = 'orig'
    await expect(
      withEnv({ RESTORE_ME: 'new' }, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(process.env.RESTORE_ME).toBe('orig')
    delete process.env.RESTORE_ME
  })
})
