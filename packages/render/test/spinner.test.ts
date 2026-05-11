import { MemoryAdapter } from '@simtabi/cli-kit-js-io'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSpinner } from '../src/index'

afterEach(() => {
  vi.useRealTimers()
})

describe('spinner: non-TTY (animation disabled)', () => {
  it('start writes status line, stop is silent', () => {
    const io = new MemoryAdapter({ isTTY: false })
    const s = createSpinner(io, { text: 'working' })
    s.start()
    expect(io.stdout).toBe('working\n')
    s.stop()
    expect(io.stdout).toBe('working\n')
  })

  it('succeed emits final line', () => {
    const io = new MemoryAdapter({ isTTY: false })
    createSpinner(io, { text: 'work' }).start().succeed('done')
    expect(io.stdout).toContain('done')
  })

  it('isRunning toggles', () => {
    const io = new MemoryAdapter({ isTTY: false })
    const s = createSpinner(io, { text: 'work' })
    expect(s.isRunning).toBe(false)
    s.start()
    expect(s.isRunning).toBe(true)
    s.stop()
    expect(s.isRunning).toBe(false)
  })
})

describe('spinner: TTY (animation enabled)', () => {
  it('redraws on interval', () => {
    vi.useFakeTimers()
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    const s = createSpinner(io, { text: 'work', intervalMs: 100 })
    s.start()
    // first frame written immediately
    const firstRaw = io.rawWrites.length
    expect(firstRaw).toBeGreaterThanOrEqual(1)
    vi.advanceTimersByTime(250)
    expect(io.rawWrites.length).toBeGreaterThan(firstRaw)
    s.stop()
  })

  it('stop clears the line', () => {
    vi.useFakeTimers()
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    const s = createSpinner(io, { text: 'work' }).start()
    s.stop()
    expect(io.rawWrites.some((w) => w.includes('\x1b[K'))).toBe(true)
  })

  it('update changes the rendered text', () => {
    vi.useFakeTimers()
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    const s = createSpinner(io, { text: 'first' }).start()
    s.update('second')
    expect(io.rawWrites.join('')).toContain('second')
    s.stop()
  })

  it('succeed prints a check mark', () => {
    vi.useFakeTimers()
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    createSpinner(io, { text: 'work' }).start().succeed('ok')
    expect(io.stdout).toContain('✔')
    expect(io.stdout).toContain('ok')
  })
})
