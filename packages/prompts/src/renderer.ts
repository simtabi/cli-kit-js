/**
 * Prompt renderer — chokepoint that lets every prompt redraw cleanly on:
 *
 *   - **TTY** (`capabilities.cursorMoves === true`): emit ANSI
 *     `\x1b[NA\x1b[J` to move up + erase below, then re-paint the frame.
 *
 *   - **Region-capable adapters** (DOM, memory with `cursorMoves: false`):
 *     open an `OutputRegion` via `io.beginRegion()`. Each repaint calls
 *     `region.clear()` and re-emits the frame; the region's storage holds
 *     all writes during that paint.
 *
 *   - **Fallback** (Console / non-cursor adapters without `beginRegion`):
 *     emit each frame on a fresh line.
 *
 * Usage:
 *
 *   const r = createPromptRenderer(io)
 *   r.paint(() => {
 *     io.writeRaw('? Name › ')
 *     io.writeRaw(buffer)
 *     return 1  // newlines emitted by this frame, +1 for the implicit row
 *   })
 *   r.end()
 *
 * Each `paint` callback returns the number of rows the new frame occupies
 * (newlines + 1 for the row the cursor lands on). Use the `rows()` helper if
 * you'd rather count for the prompt.
 */

import type { IOAdapter, OutputRegion } from '@simtabi/cli-kit-js-io'

export interface PromptRenderer {
  /**
   * Repaint the frame. `fn` must return the number of rows the new frame
   * occupies — the renderer needs that to issue the right ANSI clear next
   * time. Region/fallback renderers ignore the return value.
   */
  paint(fn: () => number): void
  /** Finalize. Subsequent writes go below the last frame. */
  end(): void
}

export function createPromptRenderer(io: IOAdapter): PromptRenderer {
  if (io.capabilities.cursorMoves) {
    return new TtyRenderer(io)
  }
  if (typeof io.beginRegion === 'function') {
    return new RegionRenderer(io.beginRegion())
  }
  return new FallbackRenderer(io)
}

/** Convenience: count newlines in a string. */
export function countNewlines(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === 0x0a) n++
  }
  return n
}

class TtyRenderer implements PromptRenderer {
  readonly #io: IOAdapter
  #rows = 0
  #ended = false

  constructor(io: IOAdapter) {
    this.#io = io
  }

  paint(fn: () => number): void {
    if (this.#ended) throw new Error('PromptRenderer: paint after end()')
    if (this.#rows > 0) {
      // Move up `rows - 1`, erase from there to end of screen.
      this.#io.writeRaw(`\r\x1b[${this.#rows - 1}A\x1b[J`)
    } else {
      this.#io.writeRaw('\r\x1b[K')
    }
    const next = fn()
    this.#rows = next > 0 ? next : 1
  }

  end(): void {
    this.#ended = true
  }
}

class RegionRenderer implements PromptRenderer {
  readonly #region: OutputRegion
  #firstPaint = true
  #ended = false

  constructor(region: OutputRegion) {
    this.#region = region
  }

  paint(fn: () => number): void {
    if (this.#ended) throw new Error('PromptRenderer: paint after end()')
    if (!this.#firstPaint) this.#region.clear()
    this.#firstPaint = false
    fn()
  }

  end(): void {
    if (this.#ended) return
    this.#ended = true
    this.#region.end()
  }
}

class FallbackRenderer implements PromptRenderer {
  readonly #io: IOAdapter
  #firstPaint = true
  #ended = false

  constructor(io: IOAdapter) {
    this.#io = io
  }

  paint(fn: () => number): void {
    if (this.#ended) throw new Error('PromptRenderer: paint after end()')
    if (!this.#firstPaint) this.#io.writeRaw('\n')
    this.#firstPaint = false
    fn()
  }

  end(): void {
    this.#ended = true
  }
}
