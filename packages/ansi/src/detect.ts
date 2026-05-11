/**
 * Capability detection. Pure functions — no side effects, no module-level
 * caches. Pass an explicit `DetectEnv` for deterministic testing, or call
 * with no arguments to read the current process/window state.
 *
 * Honors NO_COLOR, FORCE_COLOR (0/1/2/3), CLIKIT_DETERMINISTIC, COLORTERM,
 * TERM, and Windows ConPTY (Windows 10+ supports VT sequences natively).
 */

import type { Capabilities, ColorDepth, DetectEnv } from './types'

function currentEnv(): DetectEnv {
  if (typeof process !== 'undefined' && process.env != null) {
    return {
      env: process.env as Record<string, string | undefined>,
      isTTY: process.stdout?.isTTY ?? false,
      platform: process.platform,
    }
  }
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    return { env: {}, isTTY: false, platform: 'browser' }
  }
  return { env: {}, isTTY: false, platform: 'unknown' }
}

/**
 * Determine the ANSI colour depth this process / terminal supports.
 *
 * Resolution order (first match wins):
 *   1. CLIKIT_DETERMINISTIC=1 → 0
 *   2. FORCE_COLOR overrides (per https://force-color.org spec)
 *   3. NO_COLOR set & non-empty → 0
 *   4. Not a TTY → 0
 *   5. COLORTERM=truecolor / 24bit → 24
 *   6. TERM contains 256color → 8
 *   7. TERM matches known ANSI family → 4
 *   8. Win32: assume 24 on modern Windows (Win10+ supports VT)
 *   9. Otherwise → 0
 */
export function detectColorDepth(opts: DetectEnv = currentEnv()): ColorDepth {
  const env = opts.env ?? {}
  const isTTY = opts.isTTY ?? false
  const platform = opts.platform ?? 'unknown'

  if (env.CLIKIT_DETERMINISTIC === '1') return 0

  const force = env.FORCE_COLOR
  if (force !== undefined) {
    const norm = force.toLowerCase()
    if (norm === '0' || norm === 'false') return 0
    if (norm === '1' || norm === 'true') return 4
    if (norm === '2') return 8
    if (norm === '3') return 24
    // Any other truthy → 4
    if (norm.length > 0) return 4
  }

  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 0

  if (!isTTY) return 0

  const colorterm = env.COLORTERM?.toLowerCase() ?? ''
  if (colorterm === 'truecolor' || colorterm === '24bit') return 24

  const term = env.TERM?.toLowerCase() ?? ''
  if (term.includes('256color')) return 8

  if (
    term.startsWith('xterm') ||
    term.startsWith('screen') ||
    term.startsWith('tmux') ||
    term.startsWith('rxvt') ||
    term === 'linux' ||
    term === 'cygwin' ||
    term === 'ansi'
  ) {
    return 4
  }

  // Modern Windows (Win10 1607+) emits VT by default.
  if (platform === 'win32') return 24

  return 0
}

/**
 * Whether this terminal can render non-ASCII Unicode (CJK, emoji, etc.).
 *
 *   1. CLIKIT_DETERMINISTIC=1 → false
 *   2. LANG / LC_ALL / LC_CTYPE contains "utf" → true
 *   3. Win32 → trust modern Windows (true)
 *   4. Browser → true
 *   5. Otherwise → true (default optimistic for modern systems)
 */
export function detectUnicode(opts: DetectEnv = currentEnv()): boolean {
  const env = opts.env ?? {}
  const platform = opts.platform ?? 'unknown'

  if (env.CLIKIT_DETERMINISTIC === '1') return false

  const locale = (env.LC_ALL ?? env.LC_CTYPE ?? env.LANG ?? '').toLowerCase()
  if (locale.includes('utf')) return true

  if (platform === 'win32') return true
  if (platform === 'browser') return true

  return true
}

/**
 * Whether the terminal supports OSC 8 hyperlinks.
 *
 * Conservative — defaults false unless the env explicitly signals support.
 * Most modern terminals do support OSC 8 but we cannot detect reliably.
 */
export function detectHyperlinks(opts: DetectEnv = currentEnv()): boolean {
  const env = opts.env ?? {}
  if (env.CLIKIT_DETERMINISTIC === '1') return false
  if (env.NO_HYPERLINKS !== undefined && env.NO_HYPERLINKS !== '') return false
  if (env.FORCE_HYPERLINKS !== undefined && env.FORCE_HYPERLINKS !== '') return true
  // iTerm2 sets TERM_PROGRAM
  if (env.TERM_PROGRAM === 'iTerm.app') return true
  if (env.TERM_PROGRAM === 'WezTerm') return true
  if (env.TERM_PROGRAM === 'vscode') return true
  return false
}

export function detectCapabilities(opts: DetectEnv = currentEnv()): Capabilities {
  return {
    color: detectColorDepth(opts),
    unicode: detectUnicode(opts),
    hyperlinks: detectHyperlinks(opts),
    cursorMoves: detectCursorMoves(opts),
    stream: 'stdout',
  }
}

/**
 * Whether the output stream honours ANSI cursor-movement escapes.
 *
 * Conservative default: only Node TTYs and `FORCE_COLOR`-style forced
 * environments report true. Browser DOM / DevTools render escapes as text
 * and must opt out of cursor-based rendering.
 */
export function detectCursorMoves(opts: DetectEnv = currentEnv()): boolean {
  const env = opts.env ?? {}
  if (env.CLIKIT_DETERMINISTIC === '1') return false
  const isTTY = opts.isTTY ?? false
  const platform = opts.platform ?? 'unknown'
  if (platform === 'browser') return false
  return isTTY
}
