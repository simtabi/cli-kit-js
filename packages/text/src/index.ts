/**
 * `@simtabi/cli-kit-js-text`
 *
 * Width-safe text utilities. ANSI-aware via `@simtabi/cli-kit-js-ansi`,
 * Unicode-aware via an inlined width table + Intl.Segmenter for grapheme
 * cluster segmentation.
 */

export {
  align,
  type PadSide,
  pad,
  type TruncateOptions,
  truncate,
  type WrapOptions,
  wrap,
} from './manipulate'
export { codepointWidth, width } from './width'
