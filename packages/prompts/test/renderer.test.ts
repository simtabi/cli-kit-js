/**
 * Verifies the prompt renderer dispatches correctly across TTY, region-capable,
 * and fallback adapters.
 */

import { MemoryAdapter } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { createPromptRenderer } from '../src/renderer'

describe('createPromptRenderer', () => {
  it('TTY path: emits ANSI clear after first paint', () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    const r = createPromptRenderer(io)
    r.paint(() => {
      io.writeRaw('first\n')
      return 2
    })
    const firstLen = io.stdout.length
    r.paint(() => {
      io.writeRaw('second\n')
      return 2
    })
    // The second paint must have emitted at least one move-up sequence
    // (`\x1b[NA`) somewhere after the first frame.
    expect(io.stdout.slice(firstLen)).toContain('\x1b[')
  })

  it('Region path: cursorMoves false + beginRegion clears region storage', () => {
    const io = new MemoryAdapter({ isTTY: false, cursorMoves: false })
    const r = createPromptRenderer(io)
    r.paint(() => {
      io.writeRaw('first')
      return 1
    })
    r.paint(() => {
      io.writeRaw('second')
      return 1
    })
    r.end()
    // After two paints the region truncates the first frame on the second
    // paint, so stdout should only contain 'second'.
    expect(io.stdout).toBe('second')
  })

  it('Fallback path: no beginRegion ⇒ each paint on a new line', () => {
    // Build an adapter with cursorMoves:false AND no beginRegion. We patch
    // the prototype to simulate.
    const io = new MemoryAdapter({ isTTY: false, cursorMoves: false })
    // Strip the beginRegion override on this instance.
    Object.defineProperty(io, 'beginRegion', { value: undefined, configurable: true })
    const r = createPromptRenderer(io)
    r.paint(() => {
      io.writeRaw('a')
      return 1
    })
    r.paint(() => {
      io.writeRaw('b')
      return 1
    })
    expect(io.stdout).toContain('a')
    expect(io.stdout).toContain('b')
    expect(io.stdout).toContain('\n')
  })

  it('paint after end throws', () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    const r = createPromptRenderer(io)
    r.end()
    expect(() =>
      r.paint(() => {
        io.writeRaw('x')
        return 1
      }),
    ).toThrow(/after end/)
  })
})
