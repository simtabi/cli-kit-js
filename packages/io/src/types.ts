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
}

/** Public exit codes used across the runtime. */
export const EXIT_OK = 0
export const EXIT_ERROR = 1
export const EXIT_USAGE = 2
export const EXIT_SIGINT = 130
export const EXIT_SIGTERM = 143
