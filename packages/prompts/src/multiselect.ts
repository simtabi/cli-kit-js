/**
 * Multi-choice prompt with space-to-toggle, arrow-key cursor.
 *
 *   ? Pick features (Space toggles, Enter confirms):
 *   ❯ ◉ Alpha
 *     ◯ Beta
 *     ◉ Gamma
 *
 * `minSelected` / `maxSelected` enforce bounds at Enter time.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import { glyphs, isCancelKey, isEnterKey, throwIfAborted } from './render'
import { createPromptRenderer } from './renderer'
import { type MultiselectPromptOptions, PromptCancelledError, type SelectOption } from './types'

export async function multiselect<T = string>(opts: MultiselectPromptOptions<T>): Promise<T[]> {
  const { io, message, options, signal } = opts
  if (options.length === 0) throw new Error('multiselect: options must be non-empty')
  throwIfAborted(signal)

  if (!io.isTTY) {
    return multiselectNonTTY(opts)
  }

  const g = glyphs(io)
  const min = opts.minSelected ?? 0
  const max = opts.maxSelected ?? options.length
  let cursor = 0
  const selected = new Set<number>()
  if (opts.initialSelected) {
    for (let i = 0; i < options.length; i++) {
      const o = options[i]
      if (o && opts.initialSelected.includes(o.value)) selected.add(i)
    }
  }
  const sig = signal ?? new AbortController().signal
  const renderer = createPromptRenderer(io)
  let error: string | null = null

  const render = (): number => {
    let rows = 1
    io.writeRaw(`${g.q} ${message} ${g.arrow}\n`)
    for (let i = 0; i < options.length; i++) {
      const o = options[i]
      if (!o) continue
      const isCursor = i === cursor
      const isSelected = selected.has(i)
      const pointer = isCursor ? g.pointer : ' '
      const bullet = isSelected ? g.bulletOn : g.bulletOff
      const label = o.disabled ? colors.gray(o.label) : isCursor ? colors.cyan(o.label) : o.label
      io.writeRaw(`${pointer} ${bullet} ${label}\n`)
      rows++
    }
    if (error) {
      io.writeRaw(`${colors.red(error)}\n`)
      rows++
    }
    return rows
  }

  renderer.paint(render)

  try {
    while (true) {
      const key = await io.readKey(sig)
      if (isCancelKey(key)) throw new PromptCancelledError()

      if (isEnterKey(key)) {
        if (selected.size < min) {
          error = `select at least ${min}`
          renderer.paint(render)
          continue
        }
        if (selected.size > max) {
          error = `select at most ${max}`
          renderer.paint(render)
          continue
        }
        const out: T[] = []
        for (let i = 0; i < options.length; i++) {
          if (selected.has(i) && options[i]) out.push((options[i] as SelectOption<T>).value)
        }
        renderer.end()
        return out
      }
      if (key.raw === ' ' || key.name === 'space') {
        const o = options[cursor]
        if (!o || o.disabled) continue
        if (selected.has(cursor)) selected.delete(cursor)
        else selected.add(cursor)
        error = null
        renderer.paint(render)
        continue
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
      if (key.name === 'a' && key.ctrl) {
        const all = new Set<number>()
        for (let i = 0; i < options.length && all.size < max; i++) {
          if (!options[i]?.disabled) all.add(i)
        }
        selected.clear()
        for (const v of all) selected.add(v)
        renderer.paint(render)
      }
    }
  } catch (err) {
    renderer.end()
    throw err
  }
}

async function multiselectNonTTY<T>(opts: MultiselectPromptOptions<T>): Promise<T[]> {
  const { io, message, options, signal } = opts
  io.write(`${message}\n`)
  for (let i = 0; i < options.length; i++) {
    const o = options[i]
    if (!o) continue
    io.write(`  ${i + 1}. ${o.label}\n`)
  }
  io.write('Select [comma-separated]: ')
  const line = (await io.readLine(signal ?? new AbortController().signal)).trim()
  if (line.length === 0) return []
  const out: T[] = []
  for (const tok of line.split(',')) {
    const idx = Number.parseInt(tok.trim(), 10) - 1
    if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
      throw new Error(`multiselect: invalid choice '${tok}'`)
    }
    const c = options[idx]
    if (!c || c.disabled) throw new Error(`multiselect: choice ${idx + 1} disabled`)
    out.push(c.value)
  }
  return out
}

function moveCursor<T>(c: number, delta: number, options: readonly SelectOption<T>[]): number {
  let next = c
  for (let i = 0; i < options.length; i++) {
    next = (next + delta + options.length) % options.length
    if (!options[next]?.disabled) return next
  }
  return c
}
