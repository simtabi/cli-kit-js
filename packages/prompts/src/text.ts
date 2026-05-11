/**
 * Free-form text prompt.
 *
 *   ? Your name? › World█
 *
 * Enter accepts (uses `default` if buffer is empty). Backspace removes the
 * last char. Ctrl+C / Escape cancel. Validation runs on Enter; failure shows
 * the error message inline and keeps the prompt open.
 *
 * Non-TTY fallback: writes the message, reads one line via `io.readLine`.
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
import { PromptCancelledError, type TextPromptOptions } from './types'

export async function text(opts: TextPromptOptions): Promise<string> {
  const { io, message, default: defaultValue, validate, signal } = opts
  throwIfAborted(signal)

  if (!io.isTTY) {
    io.write(`${message} `)
    const line = await io.readLine(signal ?? new AbortController().signal)
    const value = line.length > 0 ? line : (defaultValue ?? '')
    if (validate) {
      const r = validate(value)
      if (r !== true) {
        io.writeError(`${colors.red('✖')} ${r}\n`)
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
    io.writeRaw(`${Q_MARK} ${message} ${ARROW} ${display}`)
    if (error) {
      // Print the error on the next line; redraw will rewrite this line, but
      // we need to come back up. For simplicity, error is sticky until the
      // user types again.
      io.writeRaw(`\n${colors.red('  ' + error)}\x1b[1A`)
    }
  }

  render()
  try {
    // biome-ignore lint/correctness/noConstantCondition: prompt loop
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
  } catch (err) {
    if (err instanceof PromptCancelledError) throw err
    throw err
  }
}
