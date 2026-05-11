/**
 * `@simtabi/cli-kit-js-text`
 *
 * Width-safe text utilities. ANSI-aware (strips before measuring), Unicode-aware
 * (handles CJK wide characters, emoji presentation, ZWJ sequences, combining
 * marks via an inlined width table).
 *
 *   - `width(s)`        — printed column count
 *   - `truncate(s, n)`  — to n columns, preserving ANSI
 *   - `wrap(s, n)`      — soft-wrap to n columns
 *   - `pad(s, n, side)` — left / right / center pad
 *   - `align(s, n, …)`  — align block of lines
 *
 * Implementation lands in M2.
 */

export const __version = '0.0.0'
