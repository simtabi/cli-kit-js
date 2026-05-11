/**
 * `@simtabi/cli-kit-js-render`
 *
 * Composable, width-safe renderers. Pure functions return strings; the
 * stateful `createSpinner` writes through an `IOAdapter`.
 *
 * Subpath: `@simtabi/cli-kit-js-render/html` exports the ANSI→HTML converter.
 */

export { banner } from './banner'
export { box, statusBox } from './box'
export { link, sanitizeUrl, type LinkOptions } from './link'
export { list } from './list'
export { progressBar } from './progress'
export { createSpinner } from './spinner'
export { table } from './table'
export { tree } from './tree'

export type {
  Align,
  AnsiHtmlOptions,
  BannerOptions,
  BoxOptions,
  BoxStyle,
  ListItem,
  ListOptions,
  ProgressBarOptions,
  SpinnerController,
  SpinnerOptions,
  SpinnerStyle,
  TableOptions,
  TreeNode,
  TreeOptions,
} from './types'
