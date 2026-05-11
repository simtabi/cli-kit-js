/**
 * Browser DOM adapter.
 *
 * **Not yet implemented.** Implementation lands in M6 with the
 * `@simtabi/cli-kit-js-render/html` ANSI→HTML converter. This file exists
 * as the subpath-export target so consumers' imports type-check today.
 *
 * The intended contract:
 *   - Mounts into a target element passed by the consumer.
 *   - `write(s)` HTML-escapes every character it didn't itself generate,
 *     converts ANSI SGR to inline `<span style="…">` segments with a 5-property
 *     CSS allowlist (`color`, `background-color`, `font-weight`, `font-style`,
 *     `text-decoration`), and appends.
 *   - Never uses `innerHTML`, `eval`, `Function`, inline event handlers, or
 *     `javascript:`/`data:` URLs.
 *   - Optional `cspNonce` for `style-src 'nonce-…'` compatibility.
 */

export const __version = '0.0.0'
