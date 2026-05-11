/**
 * Free-form text prompt.
 *
 *   ? Your name? › World█
 *
 * Enter accepts (uses `default` if buffer is empty). Backspace removes the
 * last char. Ctrl+C / Escape cancel. Validation runs on Enter; failure shows
 * the error message on the line below and keeps the prompt open. The error
 * row is wiped on the next render so it never lingers.
 *
 * Non-TTY fallback: writes the message, reads one line via `io.readLine`.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import {
  RESTORE_CURSOR,
  SAVE_CURSOR,
  clearCurrentLine,
  glyphs,
  isBackspaceKey,
  isCancelKey,
  isEnterKey,
  isPrintable,
  throwIfAborted,
} from './render'
import { PromptCancelledError, type TextPromptOptions } from './types'

export async function text(opts: TextPromptOptions): Promise<string> {
  const { io, message, default: defaultValue, validate, signal } = opts
  throwIfAborted(signal)
  const g = glyphs(io)

  if (!io.isTTY) {
    io.write(`${message} `)
    const line = await io.readLine(signal ?? new AbortController().signal)
    const value = line.length > 0 ? line : (defaultValue ?? '')
    if (validate) {
      const r = validate(value)
      if (r !== true) {
        io.writeError(`${g.cross} ${r}\n`)
        throw new Error(r)
      }
    }
    return value
  }

  let buffer = ''
  let error: string | null = null
  const sig = signal ?? new AbortController().signal

  const placeholder = opts.placeholder
    ? colors.gray(opts.placeholder)
    : defaultValue !== undefined
      ? colors.gray(defaultValue)
      : ''

  const render = () => {
    clearCurrentLine(io)
    const display = buffer.length > 0 ? buffer : placeholder
    io.writeRaw(`${g.q} ${message} ${g.arrow} ${display}`)
    // Save cursor at end of input, drop to next line, write error or clear
    // the row, then restore the cursor. Error rows therefore never linger.
    io.writeRaw(SAVE_CURSOR)
    io.writeRaw('\n\x1b[K')
    if (error) io.writeRaw(colors.red(`  ${error}`))
    io.writeRaw(RESTORE_CURSOR)
  }

  render()

  while (true) {
    const key = await io.readKey(sig)
    if (isCancelKey(key)) {
      io.writeRaw('\n')
      throw new PromptCancelledError()
    }
    if (isEnterKey(key)) {
      const value = buffer.length > 0 ? buffer : (defaultValue ?? '')
      if (validate) {
        const r = validate(value)
        if (r !== true) {
          error = r
          render()
          continue
        }
      }
      // Wipe the error row before leaving so the caller's next output
      // doesn't start with our debris.
      io.writeRaw(SAVE_CURSOR)
      io.writeRaw('\n\x1b[K')
      io.writeRaw(RESTORE_CURSOR)
      io.writeRaw('\n')
      return value
    }
    if (isBackspaceKey(key)) {
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1)
        error = null
      }
      render()
      continue
    }
    if (isPrintable(key)) {
      buffer += key.raw
      error = null
      render()
    }
  }
}
