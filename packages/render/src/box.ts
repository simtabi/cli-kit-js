/**
 * Bordered box renderer. Width-safe, ANSI-aware.
 */

import { pad, truncate, width, wrap } from '@simtabi/cli-kit-js-text'
import { BOX_CHARS } from './chars'
import type { Align, BoxOptions } from './types'

interface NormalizedPadding {
  readonly x: number
  readonly y: number
}

function normalizePadding(p: BoxOptions['padding']): NormalizedPadding {
  if (p === undefined) return { x: 1, y: 0 }
  if (typeof p === 'number') return { x: p, y: 0 }
  return { x: p.x ?? 0, y: p.y ?? 0 }
}

export function box(text: string, opts: BoxOptions = {}): string {
  const chars = BOX_CHARS[opts.style ?? 'single']
  const padding = normalizePadding(opts.padding)
  const titleAlign: Align = opts.titleAlign ?? 'left'

  // Wrap content if requested
  let lines = text.split('\n')
  if (opts.width !== undefined) {
    const innerLimit = Math.max(1, opts.width - padding.x * 2)
    lines = lines.flatMap((line) => wrap(line, innerLimit).split('\n'))
  }

  // Compute inner width (the column count of content + horizontal padding)
  let maxContent = 0
  for (const l of lines) {
    const w = width(l)
    if (w > maxContent) maxContent = w
  }
  // Account for title length when no explicit width
  if (opts.title) {
    const titleW = width(opts.title) + 4 // surrounding spaces + ' ' x 2
    if (titleW > maxContent) maxContent = titleW
  }
  const innerWidth = maxContent + padding.x * 2

  // Top border (with optional title)
  let top: string
  if (opts.title) {
    const titleText = ` ${opts.title} `
    const titleW = width(titleText)
    const remaining = innerWidth - titleW
    const leftDashes =
      titleAlign === 'left'
        ? 1
        : titleAlign === 'right'
          ? Math.max(0, remaining - 1)
          : Math.floor(remaining / 2)
    const rightDashes = remaining - leftDashes
    top =
      chars.tl +
      chars.h.repeat(Math.max(0, leftDashes)) +
      titleText +
      chars.h.repeat(Math.max(0, rightDashes)) +
      chars.tr
  } else {
    top = chars.tl + chars.h.repeat(innerWidth) + chars.tr
  }

  const bottom = chars.bl + chars.h.repeat(innerWidth) + chars.br
  const blankRow = chars.v + ' '.repeat(innerWidth) + chars.v

  const result: string[] = [top]
  for (let i = 0; i < padding.y; i++) result.push(blankRow)
  for (const line of lines) {
    const padded =
      chars.v +
      ' '.repeat(padding.x) +
      pad(line, maxContent, 'right') +
      ' '.repeat(padding.x) +
      chars.v
    result.push(padded)
  }
  for (let i = 0; i < padding.y; i++) result.push(blankRow)
  result.push(bottom)
  return result.join('\n')
}

/**
 * Convenience: truncate `text` to a single line and box it. Useful for status
 * messages where you want a bounded width regardless of input.
 */
export function statusBox(text: string, columns: number, opts: BoxOptions = {}): string {
  const padding = normalizePadding(opts.padding)
  const innerLimit = Math.max(1, columns - padding.x * 2 - 2)
  return box(truncate(text, innerLimit), { ...opts, width: columns - 2 })
}
