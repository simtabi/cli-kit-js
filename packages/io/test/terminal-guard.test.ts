import { describe, expect, it, vi } from 'vitest'
import { TerminalGuard } from '../src/index'

interface FakeStream {
  writes: string[]
  isTTY: boolean
  isRaw?: boolean
  columns?: number
  rows?: number
  write(s: string): boolean
  setRawMode(b: boolean): void
}

function fakeStdout(isTTY = true): FakeStream {
  const out: FakeStream = {
    writes: [],
    isTTY,
    write(s: string) {
      this.writes.push(s)
      return true
    },
    setRawMode(_b: boolean) {
      // no-op for write streams; included for symmetry
    },
  }
  return out
}

function fakeStdin(isTTY = true): FakeStream {
  const inn: FakeStream = {
    writes: [],
    isTTY,
    isRaw: false,
    write(_s: string) {
      return true
    },
    setRawMode(b: boolean) {
      this.isRaw = b
    },
  }
  return inn
}

describe('TerminalGuard', () => {
  it('restore() emits show-cursor, exit-alt-screen, SGR reset', () => {
    const stdout = fakeStdout()
    const stdin = fakeStdin()
    const g = new TerminalGuard({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
    })
    g.install()
    g.restore()
    expect(stdout.writes.join('')).toContain('\x1b[?25h') // show cursor
    expect(stdout.writes.join('')).toContain('\x1b[?1049l') // exit alt screen
    expect(stdout.writes.join('')).toContain('\x1b[0m') // SGR reset
  })

  it('restore() returns stdin raw-mode to original', () => {
    const stdout = fakeStdout()
    const stdin = fakeStdin()
    stdin.isRaw = false
    const g = new TerminalGuard({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
    })
    g.install()
    stdin.isRaw = true // simulate spinner/prompt entering raw mode
    g.restore()
    expect(stdin.isRaw).toBe(false)
  })

  it('idempotent — restore() twice is safe', () => {
    const stdout = fakeStdout()
    const stdin = fakeStdin()
    const g = new TerminalGuard({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
    })
    g.install()
    g.restore()
    const before = stdout.writes.length
    g.restore()
    expect(stdout.writes.length).toBe(before)
  })

  it('tolerates stdin without isTTY', () => {
    const stdout = fakeStdout()
    const stdin = fakeStdin(false)
    const setRaw = vi.spyOn(stdin, 'setRawMode')
    const g = new TerminalGuard({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
    })
    g.install()
    g.restore()
    // No raw-mode toggle when not a TTY
    expect(setRaw).not.toHaveBeenCalled()
  })
})
