/**
 * Column-aligned table renderer. Width-safe, ANSI-aware, supports multi-line
 * cells (via embedded `\n`).
 */

import { pad, truncate, width } from '@simtabi/cli-kit-js-text'
import { BOX_CHARS } from './chars'
import type { Align, TableOptions } from './types'

export function table(rows: readonly (readonly string[])[], opts: TableOptions = {}): string {
  const chars = BOX_CHARS[opts.border ?? 'single']
  const headers = opts.headers
  const alignList = opts.align ?? []
  const maxCellWidth = opts.maxCellWidth

  // Normalise rows: every cell becomes an array of lines.
  const all: string[][][] = []
  if (headers) all.push(headers.map(splitLines))
  for (const row of rows) all.push(row.map(splitLines))

  if (all.length === 0) return ''

  // Compute column count
  const cols = Math.max(...all.map((r) => r.length))
  if (cols === 0) return ''

  // Optional per-cell truncation
  if (maxCellWidth !== undefined) {
    for (const row of all) {
      for (let i = 0; i < row.length; i++) {
        row[i] = (row[i] ?? []).map((line) => truncate(line, maxCellWidth))
      }
    }
  }

  // Column widths: maximum width across every line of every cell.
  const widths = new Array<number>(cols).fill(0)
  for (const row of all) {
    for (let i = 0; i < cols; i++) {
      const cell = row[i] ?? ['']
      for (const line of cell) {
        const w = width(line)
        if (w > (widths[i] ?? 0)) widths[i] = w
      }
    }
  }

  // Build separator rows
  const top = buildSeparator(widths, chars.tl, chars.h, chars.tDown, chars.tr)
  const mid = buildSeparator(widths, chars.tRight, chars.h, chars.cross, chars.tLeft)
  const bot = buildSeparator(widths, chars.bl, chars.h, chars.tUp, chars.br)

  const out: string[] = [top]
  let firstDataRow = 0
  if (headers) {
    out.push(...renderRow(all[0] ?? [], widths, alignList, chars.v))
    out.push(mid)
    firstDataRow = 1
  }
  for (let i = firstDataRow; i < all.length; i++) {
    out.push(...renderRow(all[i] ?? [], widths, alignList, chars.v))
  }
  out.push(bot)
  return out.join('\n')
}

function splitLines(cell: string): string[] {
  return cell.split('\n')
}

function buildSeparator(
  widths: readonly number[],
  left: string,
  horizontal: string,
  joint: string,
  right: string,
): string {
  const parts = widths.map((w) => horizontal.repeat(w + 2))
  return left + parts.join(joint) + right
}

function renderRow(
  cells: readonly string[][],
  widths: readonly number[],
  align: readonly Align[],
  v: string,
): string[] {
  const cols = widths.length
  const cellLines = cells.map((c) => (c.length > 0 ? c : ['']))
  const maxLines = Math.max(...cellLines.map((c) => c.length), 1)
  const rows: string[] = []
  for (let line = 0; line < maxLines; line++) {
    let row = v
    for (let i = 0; i < cols; i++) {
      const w = widths[i] ?? 0
      const text = cellLines[i]?.[line] ?? ''
      const a = align[i] ?? 'left'
      const padded = pad(text, w, a)
      row += ` ${padded} ${v}`
    }
    rows.push(row)
  }
  return rows
}
