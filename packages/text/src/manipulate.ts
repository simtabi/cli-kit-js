/**
 * Width-safe truncate, pad, wrap, align.
 *
 * `truncate` and `wrap` strip ANSI before measuring. They preserve original
 * codepoints for the kept portion but do NOT re-emit the surrounding ANSI
 * state — caller is responsible for restoring style if needed. (A
 * style-preserving version lands when `@simtabi/cli-kit-js-render` needs it.)
 */

import { strip } from '@simtabi/cli-kit-js-ansi'
import { codepointWidth, width } from './width'

export type PadSide = 'left' | 'right' | 'center'

export interface TruncateOptions {
  readonly ellipsis?: string
  readonly position?: 'end' | 'start' | 'middle'
}

export interface WrapOptions {
  readonly hard?: boolean
  /** When true, trim leading whitespace from continuation lines. */
  readonly trim?: boolean
}

/**
 * Truncate `input` to at most `columns` columns. Appends `ellipsis` (default
 * "…") if truncation occurred.
 */
export function truncate(input: string, columns: number, opts: TruncateOptions = {}): string {
  if (columns <= 0) return ''
  const w = width(input)
  if (w <= columns) return input

  const ellipsis = opts.ellipsis ?? '…'
  const ellipsisW = width(ellipsis)
  const position = opts.position ?? 'end'

  if (ellipsisW >= columns) {
    return takeColumns(strip(input), columns).text
  }

  const plain = strip(input)
  const target = columns - ellipsisW

  if (position === 'end') {
    const { text } = takeColumns(plain, target)
    return text + ellipsis
  }
  if (position === 'start') {
    const { text } = takeColumns(plain, target, /* fromEnd */ true)
    return ellipsis + text
  }
  // middle
  const left = Math.floor(target / 2)
  const right = target - left
  const { text: leftText } = takeColumns(plain, left)
  const { text: rightText } = takeColumns(plain, right, /* fromEnd */ true)
  return leftText + ellipsis + rightText
}

/**
 * Take codepoints from `s` until the accumulated column width reaches `n`.
 * When `fromEnd` is true, walks from the right and returns the suffix.
 */
function takeColumns(s: string, n: number, fromEnd = false): { text: string; used: number } {
  if (n <= 0) return { text: '', used: 0 }
  const chars: string[] = Array.from(s) // surrogate-pair-safe
  let used = 0
  if (!fromEnd) {
    let out = ''
    for (const ch of chars) {
      const cp = ch.codePointAt(0) ?? 0
      const w = codepointWidth(cp)
      if (used + w > n) break
      out += ch
      used += w
    }
    return { text: out, used }
  }
  const tail: string[] = []
  for (let i = chars.length - 1; i >= 0; i--) {
    const ch = chars[i]
    if (ch === undefined) continue
    const cp = ch.codePointAt(0) ?? 0
    const w = codepointWidth(cp)
    if (used + w > n) break
    tail.unshift(ch)
    used += w
  }
  return { text: tail.join(''), used }
}

/**
 * Pad a string with `fill` (default " ") to reach `columns` columns.
 *
 * `side` follows the standard alignment convention:
 *   - `'left'` — text on the left edge, padding fills the right (default).
 *   - `'right'` — text on the right edge, padding fills the left.
 *   - `'center'` — text centred, padding split on both sides.
 *
 * Returns the input unchanged if already at or wider than `columns`.
 */
export function pad(input: string, columns: number, side: PadSide = 'left', fill = ' '): string {
  if (fill.length === 0) return input
  const w = width(input)
  if (w >= columns) return input
  const fillW = width(fill)
  if (fillW === 0) return input
  const need = columns - w

  if (side === 'left') return input + repeatToWidth(fill, fillW, need)
  if (side === 'right') return repeatToWidth(fill, fillW, need) + input
  // center
  const half = Math.floor(need / 2)
  return repeatToWidth(fill, fillW, half) + input + repeatToWidth(fill, fillW, need - half)
}

function repeatToWidth(unit: string, unitW: number, target: number): string {
  if (target <= 0) return ''
  const reps = Math.floor(target / unitW)
  let out = unit.repeat(reps)
  const remainder = target - reps * unitW
  if (remainder > 0) {
    // Pad remainder with spaces (simple, predictable behaviour)
    out += ' '.repeat(remainder)
  }
  return out
}

/**
 * Soft-wrap a string to at most `columns` columns per line. Line breaks fall
 * on whitespace where possible; words longer than `columns` are split unless
 * `hard` is false (in which case they overflow).
 */
export function wrap(input: string, columns: number, opts: WrapOptions = {}): string {
  if (columns <= 0) return input
  const hard = opts.hard ?? true
  const trim = opts.trim ?? false

  const lines = input.split('\n')
  const out: string[] = []
  for (const line of lines) {
    out.push(...wrapLine(line, columns, hard, trim))
  }
  return out.join('\n')
}

function wrapLine(line: string, columns: number, hard: boolean, trim: boolean): string[] {
  if (width(line) <= columns) return [line]

  // Split on whitespace runs and drop them; continuation lines get a single
  // leading space (unless `trim` is set). This preserves a visible indent
  // for soft-wrapped continuations while avoiding lone-whitespace lines.
  const words = line.split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return [line]

  const lines: string[] = []
  let current = words[0] ?? ''

  // Hard-break the very first word if it already exceeds the column budget.
  if (hard && width(current) > columns) {
    let chunk = current
    while (width(chunk) > columns) {
      const { text } = takeColumns(chunk, columns)
      lines.push(text)
      chunk = chunk.slice(text.length)
    }
    current = chunk
  }

  for (let i = 1; i < words.length; i++) {
    const word = words[i] ?? ''
    if (word.length === 0) continue
    const candidate = `${current} ${word}`
    if (width(candidate) <= columns) {
      current = candidate
      continue
    }
    // Doesn't fit — push current and start a new line.
    lines.push(current)
    const prefix = trim ? '' : ' '

    // Hard-break only if the word ITSELF exceeds the column budget. Words
    // that fit but whose leading-space prefix pushes the line one column
    // over are kept as-is — the deliberate visual indent of a soft-wrap.
    if (hard && width(word) > columns) {
      let chunk = `${prefix}${word}`
      while (width(chunk) > columns) {
        const { text } = takeColumns(chunk, columns)
        lines.push(text)
        chunk = chunk.slice(text.length)
      }
      current = chunk
    } else {
      current = `${prefix}${word}`
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

/**
 * Align a block of lines to a common width.
 */
export function align(lines: readonly string[], columns: number, side: PadSide = 'left'): string[] {
  return lines.map((line) => pad(line, columns, side))
}
