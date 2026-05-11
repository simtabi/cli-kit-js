/**
 * Width measurement.
 *
 *   - `codepointWidth(cp)` returns 0, 1, or 2 columns for a single codepoint.
 *   - `width(s)` returns the rendered column count of a string, ANSI-stripped
 *     and grapheme-cluster-segmented (so combining marks count as zero,
 *     emoji ZWJ sequences count once).
 *
 * Uses `Intl.Segmenter` (available in Node 16+, modern browsers, Deno, Bun)
 * for grapheme breaking; falls back to per-codepoint iteration if absent.
 */

import { strip } from '@simtabi/cli-kit-js-ansi'
import { WIDE_RANGES, ZERO_RANGES, rangeContains } from './width-table'

/**
 * Width of a single codepoint, in display columns:
 *   - 0 for combining marks, zero-width chars, controls (except \t and visible)
 *   - 2 for East Asian Wide / Fullwidth / emoji
 *   - 1 otherwise
 *
 * Tab (\t) is treated as width 0 here; callers that want to expand tabs to
 * spaces should do so before measuring.
 */
export function codepointWidth(cp: number): 0 | 1 | 2 {
  // C0/C1 controls except tab, LF, CR get zero
  if (cp === 0) return 0
  if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return 0
  if (rangeContains(ZERO_RANGES, cp)) return 0
  if (rangeContains(WIDE_RANGES, cp)) return 2
  return 1
}

const HAS_SEGMENTER = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
const segmenter = HAS_SEGMENTER ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null

/**
 * Width of a grapheme cluster: width of its first non-zero-width codepoint,
 * or 1 if the cluster is entirely zero-width (e.g. an isolated combining
 * mark — uncommon but defensible).
 */
function clusterWidth(cluster: string): 0 | 1 | 2 {
  let saw = false
  for (const ch of cluster) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    const w = codepointWidth(cp)
    if (!saw) {
      if (w !== 0) return w
      saw = true
    }
  }
  // Cluster consisted entirely of zero-width codepoints
  return 0
}

/**
 * Column width of a string for terminal/monospace rendering.
 * Strips ANSI sequences before measuring.
 */
export function width(input: string): number {
  if (input.length === 0) return 0
  const plain = strip(input)
  if (plain.length === 0) return 0

  let total = 0
  if (segmenter) {
    for (const { segment } of segmenter.segment(plain)) {
      total += clusterWidth(segment)
    }
  } else {
    // Codepoint fallback: doesn't merge ZWJ sequences, but is correct enough
    // for environments without Intl.Segmenter.
    for (const ch of plain) {
      const cp = ch.codePointAt(0) ?? 0
      total += codepointWidth(cp)
    }
  }
  return total
}
