/**
 * `@simtabi/cli-kit-js-ansi`
 *
 * SGR color/style wrappers, ANSI escape sanitisation, and runtime capability
 * detection. Pure functions, zero dependencies, browser-safe.
 */

export {
  detectCapabilities,
  detectColorDepth,
  detectCursorMoves,
  detectHyperlinks,
  detectUnicode,
} from './detect'

export { colors, createColors } from './colors'

export { sanitize, strip } from './sanitize'

export type {
  Capabilities,
  ColorDepth,
  ColorFn,
  Colors,
  DetectEnv,
} from './types'
