/**
 * Single-line progress bar. Pure formatting — callers manage redraw cadence
 * (or use `spinner` for animated cases).
 */

import { width } from '@simtabi/cli-kit-js-text'
import type { ProgressBarOptions } from './types'

export function progressBar(current: number, total: number, opts: ProgressBarOptions = {}): string {
  const w = opts.width ?? 40
  const complete = opts.complete ?? '█'
  const incomplete = opts.incomplete ?? '░'
  const showPercent = opts.showPercent !== false
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0
  const filled = Math.floor(ratio * w)
  const empty = Math.max(0, w - filled)
  const completeStr = repeatToCols(complete, filled)
  const incompleteStr = repeatToCols(incomplete, empty)
  let out = `[${completeStr}${incompleteStr}]`
  if (showPercent) out += ` ${Math.round(ratio * 100)}%`
  if (opts.label) out = `${opts.label} ${out}`
  return out
}

function repeatToCols(unit: string, cols: number): string {
  if (cols <= 0) return ''
  const unitW = width(unit) || 1
  const reps = Math.floor(cols / unitW)
  let out = unit.repeat(reps)
  const remainder = cols - reps * unitW
  if (remainder > 0) out += ' '.repeat(remainder)
  return out
}
