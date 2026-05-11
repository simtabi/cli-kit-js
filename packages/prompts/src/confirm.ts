/**
 * Y/N confirmation prompt.
 *
 *   ? Continue? (Y/n) ›
 *
 * Single-keystroke — `y`/`Y` → true, `n`/`N` → false, Enter → default,
 * anything else: ignored. Ctrl+C / Escape cancel.
 */

import { clearCurrentLine, glyphs, isCancelKey, isEnterKey, throwIfAborted } from './render'
import { type ConfirmPromptOptions, PromptCancelledError } from './types'

export async function confirm(opts: ConfirmPromptOptions): Promise<boolean> {
  const { io, message, signal } = opts
  const defaultValue = opts.default ?? false
  throwIfAborted(signal)

  if (!io.isTTY) {
    const yn = defaultValue ? 'Y/n' : 'y/N'
    io.write(`${message} (${yn}) `)
    const line = (await io.readLine(signal ?? new AbortController().signal)).trim().toLowerCase()
    if (line === '') return defaultValue
    if (line === 'y' || line === 'yes') return true
    if (line === 'n' || line === 'no') return false
    return defaultValue
  }

  const yn = defaultValue ? 'Y/n' : 'y/N'
  const sig = signal ?? new AbortController().signal
  const g = glyphs(io)

  const render = () => {
    clearCurrentLine(io)
    io.writeRaw(`${g.q} ${message} (${yn}) ${g.arrow} `)
  }
  render()

  while (true) {
    const key = await io.readKey(sig)
    if (isCancelKey(key)) {
      io.writeRaw('\n')
      throw new PromptCancelledError()
    }
    if (isEnterKey(key)) {
      io.writeRaw(`${defaultValue ? 'Y' : 'N'}\n`)
      return defaultValue
    }
    if (key.name === 'y' || key.raw === 'Y' || key.raw === 'y') {
      io.writeRaw('Y\n')
      return true
    }
    if (key.name === 'n' || key.raw === 'N' || key.raw === 'n') {
      io.writeRaw('N\n')
      return false
    }
  }
}
