/**
 * SGR color wrappers. The `createColors({ depth })` factory captures depth at
 * construction; the convenience singleton `colors` does the same on first use.
 *
 * All wrappers are pure: when depth is 0 they return the input unchanged.
 * Higher-depth wrappers auto-fallback when depth is lower than required
 * (`rgb` falls back to `fg256`, which falls back to nearest 16-color, which
 * falls back to no-op).
 */

import { detectColorDepth } from './detect'
import type { ColorDepth, ColorFn, Colors, DetectEnv } from './types'

const ESC = '\x1b['

function wrap(open: number, close: number, depth: ColorDepth): ColorFn {
  if (depth === 0) return (s) => s
  const start = `${ESC}${open}m`
  const end = `${ESC}${close}m`
  return (s) => start + s + end
}

function wrap256(n: number, depth: ColorDepth, isBg: boolean): ColorFn {
  if (depth === 0) return (s) => s
  if (depth >= 8) {
    const code = isBg ? 48 : 38
    const start = `${ESC}${code};5;${n}m`
    const end = `${ESC}${isBg ? 49 : 39}m`
    return (s) => start + s + end
  }
  // depth === 4 → fall back to nearest 16-color
  return wrap(nearest16(n, isBg) + (isBg ? 10 : 0), isBg ? 49 : 39, depth)
}

function wrapRgb(r: number, g: number, b: number, depth: ColorDepth, isBg: boolean): ColorFn {
  if (depth === 0) return (s) => s
  if (depth >= 24) {
    const code = isBg ? 48 : 38
    const start = `${ESC}${code};2;${r};${g};${b}m`
    const end = `${ESC}${isBg ? 49 : 39}m`
    return (s) => start + s + end
  }
  if (depth >= 8) {
    return wrap256(rgbTo256(r, g, b), depth, isBg)
  }
  return wrap(nearestBasicFromRgb(r, g, b, isBg), isBg ? 49 : 39, depth)
}

/**
 * Convert RGB to the closest 6×6×6 cube index in the 256-color palette.
 * Indexes 16-231 in the standard xterm 256 palette.
 */
function rgbTo256(r: number, g: number, b: number): number {
  // Grayscale shortcut
  if (r === g && g === b) {
    if (r < 8) return 16
    if (r > 248) return 231
    return Math.round(((r - 8) / 247) * 24) + 232
  }
  return 16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((g / 255) * 5) + Math.round((b / 255) * 5)
}

/**
 * Approximate a 256-color index to the closest of the 8 basic foregrounds
 * (30..37). Bright variants returned as 90..97. `isBg` adds 10.
 */
function nearest16(n: number, _isBg: boolean): number {
  if (n < 8) return 30 + n
  if (n < 16) return 90 + (n - 8)
  if (n >= 232) {
    // grayscale
    const gray = n - 232 // 0..23
    if (gray < 8) return 30 // black
    if (gray < 16) return 90 // bright black
    return 97 // bright white
  }
  // 6×6×6 cube → decompose
  const cube = n - 16
  const r = Math.floor(cube / 36)
  const g = Math.floor((cube % 36) / 6)
  const b = cube % 6
  return nearestBasicFromRgb6(r, g, b)
}

function nearestBasicFromRgb6(r: number, g: number, b: number): number {
  // Map each axis from 0..5 to 0/1
  const R = r >= 3 ? 1 : 0
  const G = g >= 3 ? 1 : 0
  const B = b >= 3 ? 1 : 0
  const code = (R ? 1 : 0) | ((G ? 1 : 0) << 1) | ((B ? 1 : 0) << 2)
  // Standard SGR foreground codes are 30..37 for the 8-color cube
  return 30 + code
}

function nearestBasicFromRgb(r: number, g: number, b: number, isBg: boolean): number {
  // Quantise each channel to 0/1 with mid threshold
  const R = r >= 128 ? 1 : 0
  const G = g >= 128 ? 1 : 0
  const B = b >= 128 ? 1 : 0
  const code = R | (G << 1) | (B << 2)
  return (isBg ? 40 : 30) + code
}

export function createColors(opts?: { depth?: ColorDepth; env?: DetectEnv }): Colors {
  const depth = opts?.depth ?? detectColorDepth(opts?.env)
  return Object.freeze({
    depth,
    reset: wrap(0, 0, depth),
    bold: wrap(1, 22, depth),
    dim: wrap(2, 22, depth),
    italic: wrap(3, 23, depth),
    underline: wrap(4, 24, depth),
    inverse: wrap(7, 27, depth),
    strikethrough: wrap(9, 29, depth),

    black: wrap(30, 39, depth),
    red: wrap(31, 39, depth),
    green: wrap(32, 39, depth),
    yellow: wrap(33, 39, depth),
    blue: wrap(34, 39, depth),
    magenta: wrap(35, 39, depth),
    cyan: wrap(36, 39, depth),
    white: wrap(37, 39, depth),
    gray: wrap(90, 39, depth),
    brightRed: wrap(91, 39, depth),
    brightGreen: wrap(92, 39, depth),
    brightYellow: wrap(93, 39, depth),
    brightBlue: wrap(94, 39, depth),
    brightMagenta: wrap(95, 39, depth),
    brightCyan: wrap(96, 39, depth),
    brightWhite: wrap(97, 39, depth),

    bgBlack: wrap(40, 49, depth),
    bgRed: wrap(41, 49, depth),
    bgGreen: wrap(42, 49, depth),
    bgYellow: wrap(43, 49, depth),
    bgBlue: wrap(44, 49, depth),
    bgMagenta: wrap(45, 49, depth),
    bgCyan: wrap(46, 49, depth),
    bgWhite: wrap(47, 49, depth),

    fg256: (n) => wrap256(n, depth, false),
    bg256: (n) => wrap256(n, depth, true),
    rgb: (r, g, b) => wrapRgb(r, g, b, depth, false),
    bgRgb: (r, g, b) => wrapRgb(r, g, b, depth, true),
  })
}

/** Convenience singleton; auto-detects depth on first access. */
export const colors: Colors = createColors()
