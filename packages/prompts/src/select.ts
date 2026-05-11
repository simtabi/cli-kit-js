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
import {
  ARROW,
  POINTER,
  Q_MARK,
  clearLinesAbove,
  isCancelKey,
  isEnterKey,
  throwIfAborted,
} from './render'
import { PromptCancelledError, type SelectOption, type SelectPromptOptions } from './types'

export async function select<T = string>(opts: SelectPromptOptions<T>): Promise<T> {
  const { io, message, options, signal } = opts
  if (options.length === 0) throw new Error('select: options must be non-empty')
  throwIfAborted(signal)

  if (!io.isTTY) {
    return selectNonTTY(opts)
  }

  let cursor = clampCursor(opts.initial ?? 0, options)
  const sig = signal ?? new AbortController().signal
  let renderedLines = 0

  const render = (clear = true) => {
    if (clear) clearLinesAbove(io, renderedLines - 1)
    let lines = 1
    io.writeRaw(`${Q_MARK} ${message} ${ARROW}\n`)
    for (let i = 0; i < options.length; i++) {
      const o = options[i]
      if (!o) continue
      const prefix = i === cursor ? POINTER : ' '
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
      lines++
    }
    renderedLines = lines
  }

  render(false)

  while (true) {
    const key = await io.readKey(sig)
    if (isCancelKey(key)) {
      throw new PromptCancelledError()
    }
    if (isEnterKey(key)) {
      const chosen = options[cursor]
      if (!chosen || chosen.disabled) continue
      return chosen.value
    }
    if (key.name === 'up' || key.name === 'k') {
      cursor = moveCursor(cursor, -1, options)
      render()
      continue
    }
    if (key.name === 'down' || key.name === 'j') {
      cursor = moveCursor(cursor, 1, options)
      render()
      continue
    }
    if (key.name === 'home') {
      cursor = firstEnabled(options)
      render()
      continue
    }
    if (key.name === 'end') {
      cursor = lastEnabled(options)
      render()
    }
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
