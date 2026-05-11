/**
 * OSC 8 terminal hyperlinks.
 *
 *   ESC ] 8 ; ; URL ESC \ TEXT ESC ] 8 ; ; ESC \
 *
 * Supported by iTerm2 3.1+, WezTerm, modern VSCode integrated terminal,
 * GNOME Terminal 3.26+, Konsole 20.12+, Windows Terminal 1.4+.
 *
 * For environments where the terminal won't render the escape (or where
 * `capabilities.hyperlinks === false`), we fall back to `text (url)` so the
 * URL is still readable.
 *
 * Security:
 *   - URL scheme allowlist: `http:`, `https:`, `mailto:`. Any other scheme
 *     (or unparseable URL) falls back to plain `text (url)` with the URL
 *     emitted as untrusted text — never as an active hyperlink.
 *   - The text portion is emitted verbatim; consumers passing untrusted text
 *     should sanitise with `@simtabi/cli-kit-js-ansi`'s `sanitize` first.
 */

const OSC = '\x1b]'
const ST = '\x1b\\'

const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:'])

export interface LinkOptions {
  /** Force the terminal-hyperlink form even if capabilities are uncertain. */
  readonly forceTerminal?: boolean
  /** Force the plain `text (url)` form. */
  readonly forcePlain?: boolean
  /** Capability hint — if false, plain form is used. Default true. */
  readonly hyperlinks?: boolean
}

/**
 * Emit `text` linked to `url`.
 *
 *   render.link('docs', 'https://example.com')
 *
 * If hyperlinks aren't supported (or the URL fails the scheme allowlist),
 * returns `text (url)` so the URL is still visible.
 */
export function link(text: string, url: string, opts: LinkOptions = {}): string {
  const safe = sanitizeUrl(url)
  if (safe === null) {
    // Disallowed scheme — emit as untrusted plain text without an active link.
    return `${text} (${url})`
  }

  const wantPlain = opts.forcePlain || (opts.hyperlinks === false && !opts.forceTerminal)
  if (wantPlain) return `${text} (${safe})`

  return `${OSC}8;;${safe}${ST}${text}${OSC}8;;${ST}`
}

/**
 * Validate a URL against the allowlist of schemes. Returns the URL string if
 * acceptable, or `null` if the scheme is disallowed or parsing fails.
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}
