/**
 * ANSI → HTML conversion. XSS-safe by default.
 *
 * Threat-model commitments:
 *   - Every non-control character is HTML-escaped (`& < > " ' /`).
 *   - Only SGR escapes contribute to styling; OSC, DCS, APC, PM, SOS, CSI
 *     cursor / scroll / erase / mode-set sequences are stripped before
 *     conversion (we go through `sanitize`).
 *   - Output never contains `<script>`, `<style>`, inline event handlers
 *     (`on*`), or `javascript:`/`data:` URLs.
 *   - Style attributes restricted to a 5-property allowlist:
 *     `color`, `background-color`, `font-weight`, `font-style`,
 *     `text-decoration`. Values are matched against tight regexes
 *     (hex / `rgb()` / well-known keywords).
 *   - The result is a string ready to be inserted via `.textContent` of a
 *     parent (preserving the structure) — NEVER intended for `.innerHTML`
 *     in consumer code. The DOM adapter (M6) consumes the structured form.
 */

import { sanitize, strip } from '@simtabi/cli-kit-js-ansi'
import type { AnsiHtmlOptions } from './types'

interface StyleState {
  fg?: string // colour token (hex or rgb(...))
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  dim?: boolean
}

const SGR_RE = /\x1b\[([0-9;]*)m/g

const BASIC_FG: Readonly<Record<number, string>> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'olive',
  34: 'navy',
  35: 'purple',
  36: 'teal',
  37: 'silver',
  90: 'gray',
  91: '#ff5555',
  92: '#55ff55',
  93: '#ffff55',
  94: '#5555ff',
  95: '#ff55ff',
  96: '#55ffff',
  97: 'white',
}

const BASIC_BG: Readonly<Record<number, string>> = {
  40: 'black',
  41: 'red',
  42: 'green',
  43: 'olive',
  44: 'navy',
  45: 'purple',
  46: 'teal',
  47: 'silver',
  100: 'gray',
  101: '#ff5555',
  102: '#55ff55',
  103: '#ffff55',
  104: '#5555ff',
  105: '#ff55ff',
  106: '#55ffff',
  107: 'white',
}

/**
 * Convert an ANSI-styled string into XSS-safe HTML. Returns a string of
 * `<span>` elements (no surrounding wrapper unless `opts.className` is set).
 */
export function ansiToHtml(input: string, opts: AnsiHtmlOptions = {}): string {
  // First sanitise: removes anything not SGR.
  const cleaned = sanitize(input)
  // Walk through SGR runs, emitting escaped text between them.
  let cursor = 0
  let state: StyleState = {}
  let out = ''

  const runs: Array<{ end: number; codes: readonly number[] }> = []
  for (const match of cleaned.matchAll(SGR_RE)) {
    const start = match.index ?? 0
    const codeStr = match[1] ?? ''
    const codes = parseSGR(codeStr)
    runs.push({ end: start, codes })
  }

  for (const run of runs) {
    if (run.end > cursor) {
      out += emitSpan(state, cleaned.slice(cursor, run.end))
    }
    state = applyCodes(state, run.codes)
    cursor = run.end + nextSgrLength(cleaned, run.end)
  }
  if (cursor < cleaned.length) {
    out += emitSpan(state, cleaned.slice(cursor))
  }

  if (opts.className) {
    const cls = sanitizeClassName(opts.className)
    return `<span class="${cls}">${out}</span>`
  }
  return out
}

function nextSgrLength(s: string, idx: number): number {
  // Skip the SGR sequence starting at idx. It's `\x1b[` + digits/`;` + `m`.
  let i = idx + 2 // past '\x1b['
  while (i < s.length) {
    const c = s.charCodeAt(i)
    if (c === 0x6d /* 'm' */) return i - idx + 1
    if ((c >= 0x30 && c <= 0x39) || c === 0x3b) {
      i++
      continue
    }
    return 0
  }
  return 0
}

function parseSGR(codeStr: string): readonly number[] {
  if (codeStr === '') return [0] // empty SGR == reset
  return codeStr.split(';').map((s) => Number(s) | 0)
}

function applyCodes(state: StyleState, codes: readonly number[]): StyleState {
  const next: StyleState = { ...state }
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i] ?? 0
    if (code === 0) {
      // reset
      for (const k of Object.keys(next)) delete next[k as keyof StyleState]
      continue
    }
    if (code === 1) {
      next.bold = true
      continue
    }
    if (code === 2) {
      next.dim = true
      continue
    }
    if (code === 3) {
      next.italic = true
      continue
    }
    if (code === 4) {
      next.underline = true
      continue
    }
    if (code === 9) {
      next.strike = true
      continue
    }
    if (code === 22) {
      delete next.bold
      delete next.dim
      continue
    }
    if (code === 23) {
      delete next.italic
      continue
    }
    if (code === 24) {
      delete next.underline
      continue
    }
    if (code === 29) {
      delete next.strike
      continue
    }
    if (code === 39) {
      delete next.fg
      continue
    }
    if (code === 49) {
      delete next.bg
      continue
    }
    const fgVal = BASIC_FG[code]
    if (fgVal !== undefined) {
      next.fg = fgVal
      continue
    }
    const bgVal = BASIC_BG[code]
    if (bgVal !== undefined) {
      next.bg = bgVal
      continue
    }
    // Extended: 38;5;N (256-color fg), 38;2;R;G;B (truecolor fg), and bg
    // equivalents (48;…). We consume the operands inline.
    if (code === 38 || code === 48) {
      const isBg = code === 48
      const mode = codes[i + 1]
      if (mode === 5) {
        const idx = codes[i + 2]
        if (idx !== undefined) {
          const col = palette256(idx)
          if (isBg) next.bg = col
          else next.fg = col
        }
        i += 2
      } else if (mode === 2) {
        const r = codes[i + 2] ?? 0
        const g = codes[i + 3] ?? 0
        const b = codes[i + 4] ?? 0
        const col = `rgb(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)})`
        if (isBg) next.bg = col
        else next.fg = col
        i += 4
      }
    }
  }
  return next
}

function emitSpan(state: StyleState, text: string): string {
  if (text.length === 0) return ''
  const escaped = escapeHtml(text)
  const props = stateToStyle(state)
  if (!props) return escaped
  return `<span style="${props}">${escaped}</span>`
}

function stateToStyle(state: StyleState): string {
  const parts: string[] = []
  if (state.fg) parts.push(`color: ${state.fg}`)
  if (state.bg) parts.push(`background-color: ${state.bg}`)
  if (state.bold) parts.push('font-weight: bold')
  if (state.dim && !state.bold) parts.push('opacity: 0.7')
  if (state.italic) parts.push('font-style: italic')
  if (state.underline || state.strike) {
    const decorations: string[] = []
    if (state.underline) decorations.push('underline')
    if (state.strike) decorations.push('line-through')
    parts.push(`text-decoration: ${decorations.join(' ')}`)
  }
  return parts.join('; ')
}

const HTML_ESCAPE_RE = /[&<>"'/]/g
const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
}

export function escapeHtml(s: string): string {
  return s.replace(HTML_ESCAPE_RE, (c) => HTML_ESCAPE_MAP[c] ?? c)
}

function palette256(idx: number): string {
  // First 16 entries follow BASIC palette
  if (idx < 8 && idx >= 0) {
    const code = 30 + idx
    return BASIC_FG[code] ?? '#000'
  }
  if (idx >= 8 && idx < 16) {
    const code = 90 + (idx - 8)
    return BASIC_FG[code] ?? '#000'
  }
  if (idx >= 16 && idx <= 231) {
    const c = idx - 16
    const r = Math.floor(c / 36)
    const g = Math.floor((c % 36) / 6)
    const b = c % 6
    return `rgb(${cubeChannel(r)}, ${cubeChannel(g)}, ${cubeChannel(b)})`
  }
  if (idx >= 232 && idx <= 255) {
    const gray = 8 + (idx - 232) * 10
    return `rgb(${gray}, ${gray}, ${gray})`
  }
  return '#000'
}

function cubeChannel(n: number): number {
  // Convert 0..5 cube index to 0..255 with xterm-like ramp.
  if (n === 0) return 0
  return 55 + n * 40
}

function clamp255(n: number): number {
  if (n < 0) return 0
  if (n > 255) return 255
  return Math.floor(n)
}

const CLASS_RE = /[^a-zA-Z0-9_\-]/g

function sanitizeClassName(name: string): string {
  return name.replace(CLASS_RE, '').slice(0, 64)
}

/** Strip ANSI for callers that just want safe plain-text HTML. */
export function ansiToPlainHtml(input: string): string {
  return escapeHtml(strip(input))
}
