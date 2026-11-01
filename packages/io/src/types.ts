/**
 * Public types for `@simtabi/cli-kit-js-io`.
 */

import type { Capabilities } from '@simtabi/cli-kit-js-ansi'

export interface KeyEvent {
  /** Key name (`'a'`, `'enter'`, `'tab'`, `'up'`, `'down'`, `'escape'`, `'space'`, `'backspace'`, etc.). */
  readonly name: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
  /** Raw input sequence (the bytes the terminal sent). */
  readonly raw: string
}

export type ResizeListener = () => void

/**
 * A re-paintable region anchored at the current write position.
 *
 * Returned by `IOAdapter.beginRegion?()` on adapters that can't honour ANSI
 * cursor moves (DOM, memory in `cursorMoves: false` mode). While a region is
 * open, every write to the parent adapter is scoped to the region's storage
 * — `clear()` wipes only the region's content, leaving prior output intact.
 *
 * Prompts use this to support browser-interactive rendering without emitting
 * ANSI escape sequences that the DOM would otherwise render as literal text.
 */
export interface OutputRegion {
  /** Wipe the region's content. The next write begins at the region's start. */
  clear(): void
  /**
   * Finalize the region. Subsequent writes through the parent adapter go
   * below the region's last content. Idempotent.
   */
  end(): void
}

/**
 * The single abstraction over stdin/stdout/stderr that the rest of cli-kit-js
 * writes to. Implementations exist for Node, browser DOM, browser DevTools
 * console, and in-memory testing buffers.
 */
export interface IOAdapter {
  /**
   * Write to stdout, sanitising untrusted ANSI escapes (allowlist: SGR only).
   * Always safe for arbitrary external input.
   */
  write(chunk: string): void

  /** Write to stderr with the same sanitisation rules as `write`. */
  writeError(chunk: string): void

  /**
   * Write without sanitising ANSI. In browser DOM contexts, HTML is still
   * escaped — this only releases the ANSI allowlist for cursor movement,
   * screen clear, etc. Reserve for code that emits ANSI you control.
   */
  writeRaw(chunk: string): void

  /** Clear the screen / output buffer. */
  clear(): void

  /** Wait for one key press. Rejects with `AbortError` when `signal` fires. */
  readKey(signal: AbortSignal): Promise<KeyEvent>

  /** Wait for one full line (terminated by Enter). Same abort semantics. */
  readLine(signal: AbortSignal): Promise<string>

  /** Current terminal column count. */
  readonly columns: number
  /** Current terminal row count. */
  readonly rows: number
  /** True if attached to an interactive TTY. */
  readonly isTTY: boolean
  /** True if stdout is being piped (i.e. `!isTTY`). */
  readonly isPiped: boolean
  /** Detected capabilities (colour depth, unicode, hyperlinks). */
  readonly capabilities: Capabilities
  /** Web-stream view of stdin, for streaming consumers. */
  readonly stdin: ReadableStream<Uint8Array>

  /**
   * Subscribe to terminal resize events. Returns an unsubscribe function.
   * Idempotent if invoked multiple times with the same callback.
   */
  onResize(listener: ResizeListener): () => void

  /**
   * Open a re-paintable region for prompt-style redraws. Adapters that
   * honour ANSI cursor moves (Node TTY) may leave this `undefined` — callers
   * should fall back to `\x1b[NA\x1b[J`-style redraws in that case.
   * Adapters that can't honour ANSI moves (DOM, in-memory `cursorMoves:
   * false`) implement this to provide a sub-element / sub-buffer that
   * `clear()` wipes.
   */
  beginRegion?(): OutputRegion
}

/** Public exit codes used across the runtime. */
export const EXIT_OK = 0
export const EXIT_ERROR = 1
export const EXIT_USAGE = 2
export const EXIT_SIGHUP = 129
export const EXIT_SIGINT = 130
export const EXIT_SIGTERM = 143
