/**
 * `@simtabi/cli-kit-js-ansi`
 *
 * SGR color/style wrappers, ANSI escape sanitisation, and runtime capability
 * detection. Pure functions, zero dependencies, browser-safe.
 */

export { colors, createColors } from './colors'
export {
  detectCapabilities,
  detectColorDepth,
  detectCursorMoves,
  detectHyperlinks,
  detectUnicode,
} from './detect'

export { sanitize, strip } from './sanitize'

export type {
  Capabilities,
  ColorDepth,
  ColorFn,
  Colors,
  DetectEnv,
} from './types'
