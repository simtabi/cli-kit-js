import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { createNodeStdio } from '../src/index'

/**
 * The Node adapter binds to live process.stdin/stdout/stderr, which we can't
 * exercise fully from inside a test runner. These tests check the bits that
 * are independent of TTY state: sanitisation, error routing, capability
 * detection, raw passthrough.
 */
function fakeWriteStream(isTTY = false) {
  const ws = new EventEmitter() as EventEmitter & {
    writes: string[]
    isTTY: boolean
    columns?: number
    rows?: number
    write: (s: string) => boolean
  }
  ws.writes = []
  ws.isTTY = isTTY
  ws.columns = 80
  ws.rows = 24
  ws.write = (s: string) => {
    ws.writes.push(s)
    return true
  }
  return ws
}

function fakeReadStream() {
  const rs = new EventEmitter() as EventEmitter & {
    isTTY: boolean
    isRaw?: boolean
    resume: () => void
    pause: () => void
    setRawMode?: (b: boolean) => void
  }
  rs.isTTY = false
  rs.resume = () => undefined
  rs.pause = () => undefined
  return rs
}

describe('NodeStdioAdapter', () => {
  it('write() strips non-SGR ANSI', () => {
    const stdout = fakeWriteStream()
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    io.write('\x1b]52;c;evil\x1b\\safe')
    expect(stdout.writes.join('')).toBe('safe')
  })

  it('write() preserves SGR', () => {
    const stdout = fakeWriteStream()
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    io.write('\x1b[31mred\x1b[39m')
    expect(stdout.writes.join('')).toBe('\x1b[31mred\x1b[39m')
  })

  it('writeError routes to stderr', () => {
    const stdout = fakeWriteStream()
    const stderr = fakeWriteStream()
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    io.writeError('boom')
    expect(stderr.writes).toEqual(['boom'])
    expect(stdout.writes).toEqual([])
  })

  it('writeRaw() bypasses sanitisation', () => {
    const stdout = fakeWriteStream()
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    io.writeRaw('\x1b[2Jcleared')
    expect(stdout.writes.join('')).toBe('\x1b[2Jcleared')
  })

  it('columns/rows fall back when undefined', () => {
    const stdout = fakeWriteStream()
    stdout.columns = undefined
    stdout.rows = undefined
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    expect(io.columns).toBe(80)
    expect(io.rows).toBe(24)
  })

  it('isTTY/isPiped follow stdout', () => {
    const stdout = fakeWriteStream(true)
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    expect(io.isTTY).toBe(true)
    expect(io.isPiped).toBe(false)
  })

  it('onResize fires on stdout resize event', () => {
    const stdout = fakeWriteStream(true)
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    let fired = 0
    io.onResize(() => fired++)
    stdout.emit('resize')
    stdout.emit('resize')
    expect(fired).toBe(2)
  })

  it('multiple onResize listeners all fire', () => {
    const stdout = fakeWriteStream(true)
    const io = createNodeStdio({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: fakeWriteStream() as unknown as NodeJS.WriteStream,
      stdin: fakeReadStream() as unknown as NodeJS.ReadStream,
    })
    let a = 0
    let b = 0
    const offA = io.onResize(() => a++)
    io.onResize(() => b++)
    stdout.emit('resize')
    expect(a).toBe(1)
    expect(b).toBe(1)
    offA()
    stdout.emit('resize')
    expect(a).toBe(1)
    expect(b).toBe(2)
  })
})
