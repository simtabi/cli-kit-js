/**
 * `@simtabi/cli-kit-js-text`
 *
 * Width-safe text utilities. ANSI-aware via `@simtabi/cli-kit-js-ansi`,
 * Unicode-aware via an inlined width table + Intl.Segmenter for grapheme
 * cluster segmentation.
 */

export { codepointWidth, width } from './width'
export {
  align,
  pad,
  truncate,
  wrap,
  type PadSide,
  type TruncateOptions,
  type WrapOptions,
} from './manipulate'
