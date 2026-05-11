/**
 * `@simtabi/cli-kit-js-render`
 *
 * Composable, width-safe renderers that emit strings via an IOAdapter:
 *
 *   - box(text, opts)          — bordered box
 *   - table(headers, rows)     — column-aligned table
 *   - list(items, opts)        — bulleted / numbered / nested
 *   - tree(nodes, opts)        — file-tree style
 *   - banner(text, opts)       — title block
 *   - progressBar(state)       — single-line progress
 *   - spinner(text)            — async spinner controller
 *
 * Subpath `/html` ships the ANSI → HTML converter (XSS-safe).
 *
 * Implementation lands in M4.
 */

export const __version = '0.0.0'
