/**
 * Masked password prompt.
 *
 *   ? Password? › ******█
 *
 * Control flow mirrors `text`. The buffer is held in a `SecureString` —
 * a Uint8Array we zero-fill on read/dispose. The visible mask is the only
 * thing that ever reaches `io.writeRaw`. `validate` receives a length only
 * (we never expose the underlying bytes mid-prompt).
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import {
  ARROW,
  Q_MARK,
  RESTORE_CURSOR,
  SAVE_CURSOR,
  clearCurrentLine,
  isBackspaceKey,
  isCancelKey,
  isEnterKey,
  isPrintable,
  throwIfAborted,
} from './render'
import { SecureString } from './secure-string'
import { PromptCancelledError, type PasswordPromptOptions } from './types'

export async function password(opts: PasswordPromptOptions): Promise<string> {
  const { io, message, validate, signal } = opts
  const mask = opts.mask ?? '*'
  throwIfAborted(signal)

  if (!io.isTTY) {
    io.write(`${message} `)
    const line = await io.readLine(signal ?? new AbortController().signal)
    return line
  }

  const buffer = new SecureString()
  let charCount = 0 // number of visible chars (for mask rendering)
  let error: string | null = null
  const sig = signal ?? new AbortController().signal

  const render = () => {
    clearCurrentLine(io)
    io.writeRaw(`${Q_MARK} ${message} ${ARROW} ${mask.repeat(charCount)}`)
    io.writeRaw(SAVE_CURSOR)
    io.writeRaw('\n\x1b[K')
    if (error) io.writeRaw(colors.red(`  ${error}`))
    io.writeRaw(RESTORE_CURSOR)
  }

  render()
  try {
    // biome-ignore lint/correctness/noConstantCondition: prompt loop
    while (true) {
      const key = await io.readKey(sig)
      if (isCancelKey(key)) {
        io.writeRaw('\n')
        buffer.dispose()
        throw new PromptCancelledError()
      }
      if (isEnterKey(key)) {
        if (validate) {
          // peek() keeps the buffer alive in case validation fails and the
          // user wants to edit. The materialised string is a regular JS
          // primitive but exists only for the duration of the validate call
          // when validation passes (we immediately read+dispose below) or
          // until the next garbage collection when it fails.
          const candidate = buffer.peek()
          const r = validate(candidate)
          if (r !== true) {
            error = r
            render()
            continue
          }
        }
        const value = buffer.read() // zeroes the buffer
        io.writeRaw(SAVE_CURSOR)
        io.writeRaw('\n\x1b[K')
        io.writeRaw(RESTORE_CURSOR)
        io.writeRaw('\n')
        return value
      }
      if (isBackspaceKey(key)) {
        if (charCount > 0) {
          buffer.popChar()
          charCount--
          error = null
        }
        render()
        continue
      }
      if (isPrintable(key)) {
        buffer.appendChar(key.raw)
        charCount++
        error = null
        render()
      }
    }
  } catch (err) {
    // Any non-cancel exit path (parse / write failure) — wipe.
    buffer.dispose()
    throw err
  }
}
