/**
 * Single-choice select prompt with arrow-key navigation.
 *
 *   ? Choose:
 *   ❯ Alpha
 *     Beta
 *     Gamma
 *
 * Up/Down move the cursor; Enter selects; Ctrl+C / Escape cancel.
 * Non-TTY fallback: prints a numbered list and reads one line.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import { glyphs, isCancelKey, isEnterKey, throwIfAborted } from './render'
import { createPromptRenderer } from './renderer'
import { PromptCancelledError, type SelectOption, type SelectPromptOptions } from './types'

export async function select<T = string>(opts: SelectPromptOptions<T>): Promise<T> {
  const { io, message, options, signal } = opts
  if (options.length === 0) throw new Error('select: options must be non-empty')
  throwIfAborted(signal)

  if (!io.isTTY) {
    return selectNonTTY(opts)
  }

  const g = glyphs(io)
  let cursor = clampCursor(opts.initial ?? 0, options)
  const sig = signal ?? new AbortController().signal
  const renderer = createPromptRenderer(io)

  const render = (): number => {
    let rows = 1
    io.writeRaw(`${g.q} ${message} ${g.arrow}\n`)
    for (let i = 0; i < options.length; i++) {
      const o = options[i]
      if (!o) continue
      const prefix = i === cursor ? g.pointer : ' '
      const label = o.disabled
        ? colors.gray(o.label)
        : i === cursor
          ? colors.cyan(o.label)
          : o.label
      io.writeRaw(`${prefix} ${label}`)
      if (o.description && i === cursor) {
        io.writeRaw(`  ${colors.gray(o.description)}`)
      }
      io.writeRaw('\n')
      rows++
    }
    return rows
  }

  renderer.paint(render)

  try {
    while (true) {
      const key = await io.readKey(sig)
      if (isCancelKey(key)) {
        throw new PromptCancelledError()
      }
      if (isEnterKey(key)) {
        const chosen = options[cursor]
        if (!chosen || chosen.disabled) continue
        renderer.end()
        return chosen.value
      }
      if (key.name === 'up' || key.name === 'k') {
        cursor = moveCursor(cursor, -1, options)
        renderer.paint(render)
        continue
      }
      if (key.name === 'down' || key.name === 'j') {
        cursor = moveCursor(cursor, 1, options)
        renderer.paint(render)
        continue
      }
      if (key.name === 'home') {
        cursor = firstEnabled(options)
        renderer.paint(render)
        continue
      }
      if (key.name === 'end') {
        cursor = lastEnabled(options)
        renderer.paint(render)
      }
    }
  } catch (err) {
    renderer.end()
    throw err
  }
}

async function selectNonTTY<T>(opts: SelectPromptOptions<T>): Promise<T> {
  const { io, message, options, signal } = opts
  io.write(`${message}\n`)
  for (let i = 0; i < options.length; i++) {
    const o = options[i]
    if (!o) continue
    io.write(`  ${i + 1}. ${o.label}${o.disabled ? ' (disabled)' : ''}\n`)
  }
  io.write(`Select [1-${options.length}]: `)
  const line = (await io.readLine(signal ?? new AbortController().signal)).trim()
  const idx = Number.parseInt(line, 10) - 1
  if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
    throw new Error(`select: invalid choice '${line}'`)
  }
  const choice = options[idx]
  if (!choice || choice.disabled) throw new Error(`select: choice ${idx + 1} disabled`)
  return choice.value
}

function clampCursor<T>(c: number, options: readonly SelectOption<T>[]): number {
  if (c < 0) return firstEnabled(options)
  if (c >= options.length) return lastEnabled(options)
  if (options[c]?.disabled) return firstEnabled(options)
  return c
}

function moveCursor<T>(c: number, delta: number, options: readonly SelectOption<T>[]): number {
  let next = c
  for (let i = 0; i < options.length; i++) {
    next = (next + delta + options.length) % options.length
    if (!options[next]?.disabled) return next
  }
  return c
}

function firstEnabled<T>(options: readonly SelectOption<T>[]): number {
  for (let i = 0; i < options.length; i++) {
    if (!options[i]?.disabled) return i
  }
  return 0
}

function lastEnabled<T>(options: readonly SelectOption<T>[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i]?.disabled) return i
  }
  return options.length - 1
}
