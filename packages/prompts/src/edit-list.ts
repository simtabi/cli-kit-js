/**
 * Build an array by repeatedly prompting for items.
 *
 *   ? Tags (Enter empty to finish):
 *     - alpha
 *     - beta
 *   ❯ █
 *
 * Each Enter adds the current item; an empty Enter finishes. Backspace at
 * the start of an empty line removes the last item. `min` / `max` enforce
 * bounds — finishing under-min shows an error and re-opens the prompt.
 *
 * Non-TTY fallback: reads a single comma-separated line.
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
import { type EditListPromptOptions, PromptCancelledError } from './types'

export async function editList(opts: EditListPromptOptions): Promise<readonly string[]> {
  const { io, message, signal, validate } = opts
  const min = opts.min ?? 0
  const max = opts.max ?? Number.POSITIVE_INFINITY
  const separator = opts.separator ?? ','
  throwIfAborted(signal)
  const g = glyphs(io)

  if (!io.isTTY) {
    io.write(`${message} `)
    const line = (await io.readLine(signal ?? new AbortController().signal)).trim()
    const items =
      line.length === 0
        ? []
        : line
            .split(separator)
            .map((s) => s.trim())
            .filter(Boolean)
    if (items.length < min) throw new Error(`at least ${min} required, got ${items.length}`)
    if (items.length > max) throw new Error(`at most ${max} allowed, got ${items.length}`)
    if (validate) {
      for (const it of items) {
        const r = validate(it)
        if (r !== true) throw new Error(r)
      }
    }
    return items
  }

  const items: string[] = []
  if (opts.initial) items.push(...opts.initial)
  let buffer = ''
  let error: string | null = null
  const sig = signal ?? new AbortController().signal
  const renderer = createPromptRenderer(io)

  const render = (): number => {
    let rows = 1
    io.writeRaw(`${g.q} ${message}\n`)
    for (const item of items) {
      io.writeRaw(`  ${colors.gray('-')} ${item}\n`)
      rows++
    }
    io.writeRaw(`${g.pointer} ${buffer}`)
    rows++
    if (error) {
      io.writeRaw(`\n${colors.red(`  ${error}`)}`)
      rows++
    }
    return rows
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
        if (buffer.length === 0) {
          if (items.length < min) {
            error = `add at least ${min}`
            renderer.paint(render)
            continue
          }
          error = null
          renderer.paint(render)
          renderer.end()
          io.writeRaw('\n')
          return items.slice()
        }
        if (items.length >= max) {
          error = `at most ${max}`
          renderer.paint(render)
          continue
        }
        if (validate) {
          const r = validate(buffer)
          if (r !== true) {
            error = r
            renderer.paint(render)
            continue
          }
        }
        items.push(buffer)
        buffer = ''
        error = null
        renderer.paint(render)
        continue
      }
      if (isBackspaceKey(key)) {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1)
          error = null
        } else if (items.length > 0) {
          buffer = items.pop() ?? ''
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
