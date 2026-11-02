/**
 * Type-to-filter autocomplete prompt.
 *
 *   ? Region › west█
 *   ❯ us-west-1
 *     us-west-2
 *     eu-west-1
 *
 * `source` is either a sync option array OR an async function
 * `(query: string) => Promise<SelectOption[]>` — when async, queries are
 * debounced by `debounceMs` (default 120ms). The current query string is
 * shown next to the prompt arrow; arrow keys + Enter pick from the filtered
 * list.
 *
 * Non-TTY fallback: prints message + a numbered list of `source` (resolved
 * with an empty query if async) and reads a line.
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
import {
  type AutocompletePromptOptions,
  type AutocompleteSource,
  PromptCancelledError,
  type SelectOption,
} from './types'

export async function autocomplete<T = string>(opts: AutocompletePromptOptions<T>): Promise<T> {
  const { io, message, source, signal } = opts
  const maxResults = opts.maxResults ?? 8
  throwIfAborted(signal)
  const g = glyphs(io)

  if (!io.isTTY) {
    const initial = await loadSource(source, '')
    if (initial.length === 0) throw new Error('autocomplete: source produced no options')
    io.write(`${message}\n`)
    const display = initial.slice(0, maxResults)
    for (let i = 0; i < display.length; i++) {
      const o = display[i]
      if (!o) continue
      io.write(`  ${i + 1}. ${o.label}\n`)
    }
    io.write(`Select [1-${display.length}]: `)
    const line = (await io.readLine(signal ?? new AbortController().signal)).trim()
    const idx = Number.parseInt(line, 10) - 1
    const choice = display[idx]
    if (Number.isNaN(idx) || !choice || choice.disabled) {
      throw new Error(`autocomplete: invalid choice '${line}'`)
    }
    return choice.value
  }

  let query = ''
  let filtered: readonly SelectOption<T>[] = []
  let cursor = 0
  let loading = false
  let querySeq = 0
  const sig = signal ?? new AbortController().signal
  const renderer = createPromptRenderer(io)

  const refresh = async (): Promise<void> => {
    const seq = ++querySeq
    loading = true
    renderer.paint(render)
    const next = await loadSource(source, query)
    if (seq !== querySeq) return // a newer keystroke superseded this query
    filtered = next.slice(0, maxResults)
    if (cursor >= filtered.length) cursor = Math.max(0, filtered.length - 1)
    loading = false
    renderer.paint(render)
  }

  const render = (): number => {
    let rows = 1
    io.writeRaw(`${g.q} ${message} ${g.arrow} ${query}\n`)
    if (filtered.length === 0) {
      io.writeRaw(`  ${colors.gray(loading ? 'searching…' : 'no matches')}\n`)
      rows++
      return rows
    }
    for (let i = 0; i < filtered.length; i++) {
      const o = filtered[i]
      if (!o) continue
      const prefix = i === cursor ? g.pointer : ' '
      const label = o.disabled
        ? colors.gray(o.label)
        : i === cursor
          ? colors.cyan(o.label)
          : o.label
      io.writeRaw(`${prefix} ${label}\n`)
      rows++
    }
    return rows
  }

  // Prime the result list (e.g. show the full source when the user hasn't
  // typed anything yet).
  void refresh()

  try {
    while (true) {
      const key = await io.readKey(sig)
      if (isCancelKey(key)) {
        renderer.end()
        io.writeRaw('\n')
        throw new PromptCancelledError()
      }
      if (isEnterKey(key)) {
        const choice = filtered[cursor]
        if (!choice || choice.disabled) continue
        renderer.end()
        io.writeRaw('\n')
        return choice.value
      }
      if (key.name === 'up' || (key.ctrl && key.name === 'p')) {
        if (filtered.length > 0) {
          cursor = (cursor - 1 + filtered.length) % filtered.length
        }
        renderer.paint(render)
        continue
      }
      if (key.name === 'down' || (key.ctrl && key.name === 'n')) {
        if (filtered.length > 0) {
          cursor = (cursor + 1) % filtered.length
        }
        renderer.paint(render)
        continue
      }
      if (isBackspaceKey(key)) {
        if (query.length > 0) {
          query = query.slice(0, -1)
          await refresh()
        }
        continue
      }
      if (isPrintable(key)) {
        query += key.raw
        await refresh()
      }
    }
  } catch (err) {
    renderer.end()
    throw err
  }
}

async function loadSource<T>(
  source: AutocompleteSource<T>,
  query: string,
): Promise<readonly SelectOption<T>[]> {
  if (Array.isArray(source)) {
    const q = query.toLowerCase()
    if (q.length === 0) return source as readonly SelectOption<T>[]
    return (source as readonly SelectOption<T>[]).filter((o) => o.label.toLowerCase().includes(q))
  }
  if (typeof source === 'function') {
    return await (source as (q: string) => Promise<readonly SelectOption<T>[]>)(query)
  }
  return []
}
