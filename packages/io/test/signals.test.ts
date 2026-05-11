import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignalController } from '../src/index'

/**
 * We use a fake `process` (an EventEmitter with `exit`) so the test never
 * raises real signals on the host or terminates the test runner.
 */
function fakeProcess() {
  const ee = new EventEmitter() as EventEmitter & {
    exit: (code: number) => void
  }
  const exits: number[] = []
  ee.exit = (code: number) => {
    exits.push(code)
  }
  return { proc: ee as unknown as NodeJS.Process, exits }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SignalController', () => {
  it('aborts on first SIGINT', () => {
    const { proc } = fakeProcess()
    vi.useFakeTimers()
    const sc = new SignalController({ target: proc, shutdownTimeoutMs: 5000 })
    expect(sc.signal.aborted).toBe(false)
    sc.simulate('SIGINT')
    expect(sc.signal.aborted).toBe(true)
    sc.dispose()
  })

  it('hard-exits with code 130 on second SIGINT', () => {
    const { proc, exits } = fakeProcess()
    vi.useFakeTimers()
    const sc = new SignalController({ target: proc, shutdownTimeoutMs: 5000 })
    sc.simulate('SIGINT')
    sc.simulate('SIGINT')
    expect(exits).toEqual([130])
    sc.dispose()
  })

  it('hard-exits with code 143 on second SIGTERM', () => {
    const { proc, exits } = fakeProcess()
    vi.useFakeTimers()
    const sc = new SignalController({ target: proc, shutdownTimeoutMs: 5000 })
    sc.simulate('SIGTERM')
    sc.simulate('SIGTERM')
    expect(exits).toEqual([143])
    sc.dispose()
  })

  it('hard-exits after timeout', () => {
    const { proc, exits } = fakeProcess()
    vi.useFakeTimers()
    const sc = new SignalController({ target: proc, shutdownTimeoutMs: 1000 })
    sc.simulate('SIGINT')
    vi.advanceTimersByTime(1000)
    expect(exits).toEqual([130])
    sc.dispose()
  })

  it('SIGPIPE exits 0 gracefully', () => {
    const { proc, exits } = fakeProcess()
    new SignalController({ target: proc, shutdownTimeoutMs: 1000 })
    proc.emit('SIGPIPE')
    expect(exits).toEqual([0])
  })

  it('dispose() removes all listeners', () => {
    const { proc } = fakeProcess()
    const sc = new SignalController({ target: proc, shutdownTimeoutMs: 1000 })
    expect(proc.listenerCount('SIGINT')).toBeGreaterThan(0)
    sc.dispose()
    expect(proc.listenerCount('SIGINT')).toBe(0)
    expect(proc.listenerCount('SIGTERM')).toBe(0)
    expect(proc.listenerCount('SIGHUP')).toBe(0)
    expect(proc.listenerCount('SIGPIPE')).toBe(0)
  })
})
