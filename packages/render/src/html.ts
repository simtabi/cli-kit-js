/**
 * ANSI → HTML conversion, XSS-safe by default.
 * Never uses innerHTML; consumers receive a structured `RenderResult` they can
 * mount via the DOM adapter, or a sanitised HTML string for static rendering.
 *
 * Implementation lands in M6.
 */

export const __version = '0.0.0'
