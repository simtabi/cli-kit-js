/**
 * Shared rendering helpers for interactive prompts.
 *
 * Cursor strategy:
 *   - Prompts that render N lines remember N and emit CR + `\x1b[NA` +
 *     `\x1b[J` (move up N, erase down) before each redraw.
 *   - Single-line prompts use `\r\x1b[K` (erase current line).
 *   - All movement goes through `io.writeRaw` so it bypasses sanitisation.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter, KeyEvent } from '@simtabi/cli-kit-js-io'
import { PromptCancelledError } from './types'

export const Q_MARK = colors.cyan('?')
export const ARROW = colors.cyan('›')
export const POINTER = colors.cyan('❯')
export const CHECK = colors.green('✔')
export const CROSS = colors.red('✖')
export const BULLET_ON = colors.green('◉')
export const BULLET_OFF = colors.gray('◯')

export function clearCurrentLine(io: IOAdapter): void {
  io.writeRaw('\r\x1b[K')
}

export function clearLinesAbove(io: IOAdapter, n: number): void {
  if (n <= 0) {
    clearCurrentLine(io)
    return
  }
  io.writeRaw(`\r\x1b[${n}A\x1b[J`)
}

/**
 * Throw `PromptCancelledError` if the abort signal has fired.
 */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new PromptCancelledError()
}

export function isPrintable(key: KeyEvent): boolean {
  // Ignore special-key escape sequences: the raw value of an arrow key, for
  // example, is a multi-byte sequence we don't want to insert into a text
  // buffer. Filter to single-character raw that is >= space.
  if (key.ctrl || key.meta) return false
  if (key.raw.length !== 1) return false
  const code = key.raw.charCodeAt(0)
  return code >= 0x20 && code !== 0x7f
}

export function isCancelKey(key: KeyEvent): boolean {
  return (key.ctrl && key.name === 'c') || key.name === 'escape'
}

export function isEnterKey(key: KeyEvent): boolean {
  return key.name === 'return' || key.name === 'enter'
}

export function isBackspaceKey(key: KeyEvent): boolean {
  return key.name === 'backspace' || key.raw === '\x7f' || key.raw === '\b'
}
