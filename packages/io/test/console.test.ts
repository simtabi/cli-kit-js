import { describe, expect, it, vi } from 'vitest'
import { createConsoleAdapter, toConsoleArgs } from '../src/console'

describe('toConsoleArgs', () => {
  it('plain string returns single-element tuple', () => {
    expect(toConsoleArgs('hello')).toEqual(['hello'])
  })

  it('SGR red wraps in %c with css', () => {
    const [fmt, css] = toConsoleArgs('\x1b[31mred\x1b[39m')
    expect(fmt).toContain('%c')
    expect(css).toContain('color: ')
  })

  it('strips OSC sequences', () => {
    expect(toConsoleArgs('safe\x1b]52;c;evil\x1b\\done')).toEqual(['safedone'])
  })

  it('multiple runs produce multiple css args', () => {
    const args = toConsoleArgs('\x1b[31mA\x1b[39m \x1b[32mB\x1b[39m')
    expect(args.length).toBeGreaterThanOrEqual(3)
  })

  it('truecolor renders rgb()', () => {
    const [_, css] = toConsoleArgs('\x1b[38;2;10;20;30mx\x1b[39m')
    expect(css).toContain('rgb(10, 20, 30)')
  })
})

describe('ConsoleAdapter', () => {
  function fakeConsole() {
    return {
      logs: [] as unknown[][],
      errs: [] as unknown[][],
      clears: 0,
      log: vi.fn(function (this: { logs: unknown[][] }, ...args: unknown[]) {
        this.logs.push(args)
      }),
      error: vi.fn(function (this: { errs: unknown[][] }, ...args: unknown[]) {
        this.errs.push(args)
      }),
      clear: vi.fn(function (this: { clears: number }) {
        this.clears++
      }),
    } as unknown as Console & { logs: unknown[][]; errs: unknown[][]; clears: number }
  }

  it('flushes on newline', () => {
    const c = fakeConsole()
    const io = createConsoleAdapter({ console: c })
    io.write('hello\n')
    expect(c.log).toHaveBeenCalledWith('hello')
  })

  it('does not flush mid-line', () => {
    const c = fakeConsole()
    const io = createConsoleAdapter({ console: c })
    io.write('partial')
    expect(c.log).not.toHaveBeenCalled()
  })

  it('writeError routes to console.error', () => {
    const c = fakeConsole()
    const io = createConsoleAdapter({ console: c })
    io.writeError('boom\n')
    expect(c.error).toHaveBeenCalledWith('boom')
  })

  it('throws on readKey / readLine', async () => {
    const io = createConsoleAdapter({ console: fakeConsole() })
    const ac = new AbortController()
    await expect(io.readKey(ac.signal)).rejects.toThrow(/not supported/)
    await expect(io.readLine(ac.signal)).rejects.toThrow(/not supported/)
  })
})
