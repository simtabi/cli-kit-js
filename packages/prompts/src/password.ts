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
import { glyphs, isBackspaceKey, isCancelKey, isEnterKey, isPrintable, throwIfAborted } from './render'
import { createPromptRenderer } from './renderer'
import { SecureString } from './secure-string'
import { type PasswordPromptOptions, PromptCancelledError } from './types'

export async function password(opts: PasswordPromptOptions): Promise<string> {
  const { io, message, validate, signal } = opts
  const mask = opts.mask ?? '*'
  throwIfAborted(signal)

  if (!io.isTTY) {
    io.write(`${message} `)
    const line = await io.readLine(signal ?? new AbortController().signal)
    return line
  }

  const g = glyphs(io)
  const buffer = new SecureString()
  let charCount = 0
  let error: string | null = null
  const sig = signal ?? new AbortController().signal
  const renderer = createPromptRenderer(io)

  const render = (): number => {
    io.writeRaw(`${g.q} ${message} ${g.arrow} ${mask.repeat(charCount)}`)
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
        buffer.dispose()
        throw new PromptCancelledError()
      }
      if (isEnterKey(key)) {
        if (validate) {
          const candidate = buffer.peek()
          const r = validate(candidate)
          if (r !== true) {
            error = r
            renderer.paint(render)
            continue
          }
        }
        const value = buffer.read()
        error = null
        renderer.paint(render)
        renderer.end()
        io.writeRaw('\n')
        return value
      }
      if (isBackspaceKey(key)) {
        if (charCount > 0) {
          buffer.popChar()
          charCount--
          error = null
        }
        renderer.paint(render)
        continue
      }
      if (isPrintable(key)) {
        buffer.appendChar(key.raw)
        charCount++
        error = null
        renderer.paint(render)
      }
    }
  } catch (err) {
    renderer.end()
    buffer.dispose()
    throw err
  }
}
