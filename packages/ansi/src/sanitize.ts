/**
 * ANSI sanitisation.
 *
 *   - `strip(s)`     — remove every ANSI escape sequence (SGR, CSI, OSC, DCS, …).
 *   - `sanitize(s)`  — allowlist filter. Keeps only SGR (`\x1b[…m`) sequences;
 *                      strips OSC (clipboard hijack vector), DCS, APC, PM, SOS,
 *                      and CSI sequences other than SGR (cursor movement,
 *                      scrolling, erase, mode set/reset, save/restore, etc.).
 *
 * `sanitize` is the single chokepoint for external strings flowing into any
 * TTY-bound IOAdapter. It is allowlist-based, not denylist-based — anything
 * outside the SGR allowlist is removed.
 *
 * Regexes are anchored, bounded, and ReDoS-safe.
 */

// All ANSI escape sequences we recognise.
//
//   ESC [ … <final>          — CSI; final 0x40..0x7E
//   ESC ] … (BEL | ESC \)    — OSC
//   ESC P … ESC \            — DCS
//   ESC ^ … ESC \            — PM
//   ESC _ … ESC \            — APC
//   ESC X … ESC \            — SOS
//   ESC <single char>        — one-byte controls (e.g. ESC c reset)
//
// We tolerate UTF-8 in the payload. Quantifiers are bounded to prevent ReDoS.

const ESC = '\\u001b'
const ST = `(?:\\u0007|${ESC}\\\\)` // BEL or ESC \

// CSI: ESC [ params final
// params: 0–256 chars in 0x30..0x3F (0-9 : ; < = > ?) and 0x20..0x2F intermediate
// final: 0x40..0x7E
const CSI_RE = new RegExp(
  `${ESC}\\[[\\u0030-\\u003F]{0,256}[\\u0020-\\u002F]{0,256}[\\u0040-\\u007E]`,
  'g',
)

// Specifically SGR: CSI with final byte 'm'
const SGR_RE = new RegExp(`${ESC}\\[[\\u0030-\\u003F]{0,256}[\\u0020-\\u002F]{0,256}m`, 'g')

// OSC: ESC ] payload ST
const OSC_RE = new RegExp(`${ESC}\\][\\s\\S]{0,4096}?${ST}`, 'g')

// DCS / PM / APC / SOS — all introducers followed by payload terminated by ST
const DCS_RE = new RegExp(`${ESC}[PX^_][\\s\\S]{0,4096}?${ST}`, 'g')

// Single-byte ESC controls (ESC + one of !-~), excluding [ ] P X ^ _ which begin
// multi-byte sequences handled above.
const SINGLE_ESC_RE = new RegExp(`${ESC}[\\u0040-\\u005A\\u005C\\u0060-\\u007E]`, 'g')

/**
 * Remove every ANSI escape sequence. The result is plain text.
 */
export function strip(input: string): string {
  if (input.length === 0 || input.indexOf('\x1b') === -1) return input
  return input
    .replace(OSC_RE, '')
    .replace(DCS_RE, '')
    .replace(CSI_RE, '')
    .replace(SINGLE_ESC_RE, '')
}

/**
 * Keep only SGR sequences. Strip everything else.
 *
 * This is the function to call on any string from an untrusted source before
 * it touches a TTY-bound output.
 */
export function sanitize(input: string): string {
  if (input.length === 0 || input.indexOf('\x1b') === -1) return input

  // Preserve SGR sequences by remembering their positions, then stripping
  // everything ANSI, then re-emitting plain text only. Simplest robust path:
  // walk the string, copying SGR sequences verbatim and skipping all other
  // escapes.
  let out = ''
  let i = 0
  const len = input.length
  while (i < len) {
    const ch = input[i]
    if (ch !== '\x1b') {
      out += ch
      i++
      continue
    }
    // It's an escape — figure out which kind by looking at next char.
    const next = input[i + 1]
    if (next === '[') {
      // CSI. Find final byte.
      const final = findCsiFinal(input, i + 2)
      if (final === -1) {
        // Malformed; drop the ESC and resume.
        i++
        continue
      }
      const finalCh = input[final]
      if (finalCh === 'm') {
        // SGR — keep it.
        out += input.slice(i, final + 1)
      }
      i = final + 1
      continue
    }
    if (next === ']' || next === 'P' || next === 'X' || next === '^' || next === '_') {
      // OSC / DCS / PM / APC / SOS — strip up to ST.
      const stIdx = findString(input, i + 2, ['\x07', '\x1b\\'])
      i = stIdx === -1 ? len : stIdx
      continue
    }
    // Single-byte ESC control — strip it.
    i += next !== undefined ? 2 : 1
  }
  return out
}

function findCsiFinal(s: string, start: number): number {
  // Final byte is 0x40..0x7E. Parameter bytes 0x30..0x3F, intermediate 0x20..0x2F.
  // Bound to 1 KiB to prevent unbounded scans.
  const cap = Math.min(s.length, start + 1024)
  for (let i = start; i < cap; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x40 && c <= 0x7e) return i
    if ((c >= 0x30 && c <= 0x3f) || (c >= 0x20 && c <= 0x2f)) continue
    // Malformed parameter byte.
    return -1
  }
  return -1
}

function findString(s: string, start: number, terminators: readonly string[]): number {
  const cap = Math.min(s.length, start + 8192)
  for (let i = start; i < cap; i++) {
    for (const t of terminators) {
      if (t.length === 1) {
        if (s[i] === t) return i + 1
      } else if (s.startsWith(t, i)) {
        return i + t.length
      }
    }
  }
  return -1
}

/** Internal: re-exported for tests that need to verify the regexes don't
 *  catastrophically backtrack. */
export const _internals = { CSI_RE, SGR_RE, OSC_RE, DCS_RE, SINGLE_ESC_RE }
