import { describe, expect, it } from 'vitest'
import { MemoryAdapter } from '../src/index'

describe('MemoryAdapter: writes', () => {
  it('captures write into stdout', () => {
    const io = new MemoryAdapter()
    io.write('hello')
    expect(io.stdout).toBe('hello')
  })

  it('captures writeError into stderr', () => {
    const io = new MemoryAdapter()
    io.writeError('oops')
    expect(io.stderr).toBe('oops')
  })

  it('sanitises non-SGR ANSI in write', () => {
    const io = new MemoryAdapter()
    io.write('safe\x1b]52;c;evil\x1b\\done')
    expect(io.stdout).toBe('safedone')
  })

  it('preserves SGR through write', () => {
    const io = new MemoryAdapter()
    io.write('\x1b[31mred\x1b[39m')
    expect(io.stdout).toBe('\x1b[31mred\x1b[39m')
  })

  it('writeRaw bypasses sanitisation', () => {
    const io = new MemoryAdapter()
    io.writeRaw('\x1b[2Jcleared')
    expect(io.stdout).toContain('\x1b[2J')
    expect(io.rawWrites).toEqual(['\x1b[2Jcleared'])
  })

  it('clear() resets stdout and counts', () => {
    const io = new MemoryAdapter()
    io.write('x')
    io.clear()
    expect(io.stdout).toBe('')
    expect(io.clearCount).toBe(1)
  })
})

describe('MemoryAdapter: capabilities and dimensions', () => {
  it('defaults', () => {
    const io = new MemoryAdapter()
    expect(io.columns).toBe(80)
    expect(io.rows).toBe(24)
    expect(io.isTTY).toBe(false)
    expect(io.isPiped).toBe(true)
    expect(io.capabilities.color).toBe(0)
  })

  it('honors options', () => {
    const io = new MemoryAdapter({ columns: 120, rows: 40, isTTY: true })
    expect(io.columns).toBe(120)
    expect(io.rows).toBe(40)
    expect(io.isTTY).toBe(true)
    expect(io.isPiped).toBe(false)
    expect(io.capabilities.color).toBe(24)
  })

  it('setSize fires onResize listeners', () => {
    const io = new MemoryAdapter()
    let fired = 0
    const off = io.onResize(() => fired++)
    io.setSize(100, 30)
    io.setSize(120, 40)
    expect(fired).toBe(2)
    off()
    io.setSize(80, 24)
    expect(fired).toBe(2)
  })
})

describe('MemoryAdapter: prompts', () => {
  it('replays queued keys', async () => {
    const io = new MemoryAdapter()
    io.queueKey({ name: 'a' })
    io.queueKey({ name: 'enter' })
    const ac = new AbortController()
    const k1 = await io.readKey(ac.signal)
    const k2 = await io.readKey(ac.signal)
    expect(k1.name).toBe('a')
    expect(k2.name).toBe('enter')
  })

  it('replays queued lines', async () => {
    const io = new MemoryAdapter()
    io.queueLine('hello')
    const ac = new AbortController()
    expect(await io.readLine(ac.signal)).toBe('hello')
  })

  it('readKey throws AbortError when signal pre-fired', async () => {
    const io = new MemoryAdapter()
    const ac = new AbortController()
    ac.abort()
    await expect(io.readKey(ac.signal)).rejects.toThrow('aborted')
  })

  it('readLine throws when no line queued', async () => {
    const io = new MemoryAdapter()
    const ac = new AbortController()
    await expect(io.readLine(ac.signal)).rejects.toThrow('no queued line')
  })
})
