/**
 * Title banner — a heavier `box` with center-aligned content by default.
 */

import { pad, width } from '@simtabi/cli-kit-js-text'
import { BOX_CHARS } from './chars'
import type { BannerOptions } from './types'

export function banner(text: string, opts: BannerOptions = {}): string {
  const chars = BOX_CHARS[opts.style ?? 'double']
  const align = opts.align ?? 'center'
  const lines = text.split('\n')
  const maxW = Math.max(...lines.map((l) => width(l)), 0)
  const innerWidth = maxW + 4 // 2-cell horizontal padding each side

  const top = chars.tl + chars.h.repeat(innerWidth) + chars.tr
  const bot = chars.bl + chars.h.repeat(innerWidth) + chars.br

  const out: string[] = [top]
  for (const line of lines) {
    const padded = pad(line, maxW, align)
    out.push(`${chars.v}  ${padded}  ${chars.v}`)
  }
  out.push(bot)
  return out.join('\n')
}
