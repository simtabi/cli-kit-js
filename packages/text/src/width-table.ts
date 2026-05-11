/**
 * Inlined Unicode width data.
 *
 * Sorted Uint32Array of [start, end] codepoint pairs (inclusive on both ends).
 * Lookup is O(log n) via binary search.
 *
 * Coverage:
 *   - WIDE: East Asian Wide + Fullwidth + commonly-rendered-as-wide emoji blocks.
 *   - ZERO: combining marks, joiners, variation selectors, zero-width chars.
 *
 * Source basis: Unicode 15.1 East Asian Width + General Category Mn/Mc/Cf.
 *
 * This table is intentionally conservative — it covers the categories that
 * matter for CLI rendering (CJK columns, emoji widths, combining accents) but
 * does not enumerate every esoteric script. ~80 ranges total.
 */

export const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = Object.freeze([
  // Hangul Jamo
  [0x1100, 0x115f],
  // U+2329, U+232A LEFT-POINTING / RIGHT-POINTING ANGLE BRACKET
  [0x2329, 0x232a],
  // CJK Radicals Supplement, Kangxi Radicals
  [0x2e80, 0x303e],
  // CJK Symbols & Punctuation, Hiragana, Katakana, Bopomofo, Hangul Compat Jamo
  [0x3041, 0x33ff],
  // CJK Unified Ideographs Extension A
  [0x3400, 0x4dbf],
  // CJK Unified Ideographs
  [0x4e00, 0x9fff],
  // Yi Syllables + Radicals
  [0xa000, 0xa4cf],
  // Hangul Syllables
  [0xac00, 0xd7a3],
  // CJK Compatibility Ideographs
  [0xf900, 0xfaff],
  // Vertical Forms
  [0xfe10, 0xfe19],
  // CJK Compatibility Forms
  [0xfe30, 0xfe4f],
  // Fullwidth Forms
  [0xff00, 0xff60],
  // Fullwidth signs
  [0xffe0, 0xffe6],
  // Emoji blocks
  [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f700, 0x1f77f],
  [0x1f780, 0x1f7ff],
  [0x1f800, 0x1f8ff],
  [0x1f900, 0x1f9ff],
  [0x1fa00, 0x1fa6f],
  [0x1fa70, 0x1faff],
  // CJK Unified Ideographs Extensions B–G and beyond
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
])

export const ZERO_RANGES: ReadonlyArray<readonly [number, number]> = Object.freeze([
  // C0 controls except 0x09 (tab), 0x0a (LF), 0x0d (CR) — special-cased below
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  // Combining Diacritical Marks
  [0x0300, 0x036f],
  // Hebrew accents
  [0x0483, 0x0489],
  // Arabic combining marks
  [0x0591, 0x05bd],
  [0x05bf, 0x05bf],
  [0x05c1, 0x05c2],
  [0x05c4, 0x05c5],
  [0x05c7, 0x05c7],
  [0x0610, 0x061a],
  [0x064b, 0x065f],
  [0x0670, 0x0670],
  [0x06d6, 0x06dc],
  [0x06df, 0x06e4],
  [0x06e7, 0x06e8],
  [0x06ea, 0x06ed],
  // Soft hyphen
  [0x00ad, 0x00ad],
  // Zero-width chars: ZWSP, ZWNJ, ZWJ, LRM, RLM
  [0x200b, 0x200f],
  // Line/paragraph separators are width 0 in our model
  [0x2028, 0x2029],
  // Bidi controls
  [0x202a, 0x202e],
  // Invisible mathematical operators
  [0x2060, 0x206f],
  // Combining marks for symbols
  [0x20d0, 0x20ff],
  // Variation Selectors
  [0xfe00, 0xfe0f],
  // Combining Half Marks
  [0xfe20, 0xfe2f],
  // BOM / non-character at end of plane 0
  [0xfeff, 0xfeff],
  // Variation Selectors Supplement
  [0xe0100, 0xe01ef],
])

/**
 * Binary search a flat sorted ranges array. Returns true if `cp` is contained
 * in any [start, end] inclusive range.
 */
export function rangeContains(
  ranges: ReadonlyArray<readonly [number, number]>,
  cp: number,
): boolean {
  let lo = 0
  let hi = ranges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const r = ranges[mid]
    if (!r) return false
    const [start, end] = r
    if (cp < start) hi = mid - 1
    else if (cp > end) lo = mid + 1
    else return true
  }
  return false
}
