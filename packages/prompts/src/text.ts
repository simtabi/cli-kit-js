/**
 * Free-form text prompt.
 *
 *   ? Your name? › World█
 *
 * Enter accepts (uses `default` if buffer is empty). Backspace removes the
 * last char. Ctrl+C / Escape cancel. Validation runs on Enter; failure shows
 * the error on the line below and keeps the prompt open. The error row is
 * wiped on the next render so it never lingers.
 *
 * Non-TTY fallback: writes the message, reads one line via `io.readLine`.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import {
  glyphs,
  isBackspaceKey,
  isCancelKey,
  isEnterKey,
  isPrintable,
  throwIfAborted,
} from './render'
import { createPromptRenderer } from './renderer'
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
  const renderer = createPromptRenderer(io)

  const placeholder = opts.placeholder
    ? colors.gray(opts.placeholder)
    : defaultValue !== undefined
      ? colors.gray(defaultValue)
      : ''

  const render = (): number => {
    const display = buffer.length > 0 ? buffer : placeholder
    io.writeRaw(`${g.q} ${message} ${g.arrow} ${display}`)
    if (error) {
      io.writeRaw(`\n${colors.red(`  ${error}`)}`)
      return 2
    }
    return 1
  }

  renderer.paint(render)

  try {
    while (true) {
      const key = await io.readKey(sig)
      if (isCancelKey(key)) {
        renderer.end()
        io.writeRaw('\n')
        throw new PromptCancelledError()
      }
      if (isEnterKey(key)) {
        const value = buffer.length > 0 ? buffer : (defaultValue ?? '')
        if (validate) {
          const r = validate(value)
          if (r !== true) {
            error = r
            renderer.paint(render)
            continue
          }
        }
        // Final paint without the error row, so caller's next output is clean.
        error = null
        renderer.paint(render)
        renderer.end()
        io.writeRaw('\n')
        return value
      }
      if (isBackspaceKey(key)) {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1)
          error = null
        }
        renderer.paint(render)
        continue
      }
      if (isPrintable(key)) {
        buffer += key.raw
        error = null
        renderer.paint(render)
      }
    }
  } catch (err) {
    renderer.end()
    throw err
  }
}
