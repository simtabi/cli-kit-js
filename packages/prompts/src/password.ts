/**
 * Masked password prompt.
 *
 *   ? Password? › ******█
 *
 * Identical control flow to `text`, but rendered chars are replaced with
 * `mask` (default '*'). Buffer is held in a regular string (we do not yet
 * implement secure-string wiping — see SECURITY.md follow-ups).
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import {
  ARROW,
  Q_MARK,
  clearCurrentLine,
  isBackspaceKey,
  isCancelKey,
  isEnterKey,
  isPrintable,
  throwIfAborted,
} from './render'
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

  let buffer = ''
  let error: string | null = null
  const sig = signal ?? new AbortController().signal

  const render = () => {
    clearCurrentLine(io)
    io.writeRaw(`${Q_MARK} ${message} ${ARROW} ${mask.repeat(buffer.length)}`)
    if (error) io.writeRaw(`\n${colors.red('  ' + error)}\x1b[1A`)
  }

  render()
  // biome-ignore lint/correctness/noConstantCondition: prompt loop
  while (true) {
    const key = await io.readKey(sig)
    if (isCancelKey(key)) {
      io.writeRaw('\n')
      throw new PromptCancelledError()
    }
    if (isEnterKey(key)) {
      if (validate) {
        const r = validate(buffer)
        if (r !== true) {
          error = r
          render()
          continue
        }
      }
      io.writeRaw('\n')
      return buffer
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
