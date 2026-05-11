/**
 * Public types for `@simtabi/cli-kit-js-render`.
 */

export type BoxStyle = 'single' | 'double' | 'round' | 'bold' | 'ascii'

export type Align = 'left' | 'right' | 'center'

export interface BoxOptions {
  readonly style?: BoxStyle
  /** Horizontal/vertical padding. Number = both axes, object = per-axis. */
  readonly padding?: number | { readonly x?: number; readonly y?: number }
  /** Top-of-box title. */
  readonly title?: string
  readonly titleAlign?: Align
  /** Wrap content lines to this column count. */
  readonly width?: number
}

export interface TableOptions {
  readonly headers?: readonly string[]
  readonly border?: BoxStyle
  readonly align?: readonly Align[]
  /** Maximum column width — content beyond gets truncated. */
  readonly maxCellWidth?: number
  /** Truncate long rows instead of letting them overflow. */
  readonly truncate?: boolean
}

export type ListItem = string | { readonly text: string; readonly children?: readonly ListItem[] }

export interface ListOptions {
  readonly ordered?: boolean
  readonly bullet?: string
  readonly indent?: number
}

export interface TreeNode {
  readonly label: string
  readonly children?: readonly TreeNode[]
}

export interface TreeOptions {
  /** Render with ASCII fall-back instead of box-drawing characters. */
  readonly ascii?: boolean
}

export interface BannerOptions {
  readonly style?: BoxStyle
  readonly align?: Align
}

export interface ProgressBarOptions {
  readonly width?: number
  readonly complete?: string
  readonly incomplete?: string
  readonly showPercent?: boolean
  readonly label?: string
}

export type SpinnerStyle = 'dots' | 'line' | 'arc' | 'circle' | 'arrow' | 'bounce'

export interface SpinnerOptions {
  readonly text?: string
  readonly style?: SpinnerStyle
  readonly intervalMs?: number
}

export interface SpinnerController {
  start(text?: string): SpinnerController
  stop(finalText?: string): SpinnerController
  succeed(text?: string): SpinnerController
  fail(text?: string): SpinnerController
  warn(text?: string): SpinnerController
  info(text?: string): SpinnerController
  update(text: string): SpinnerController
  readonly isRunning: boolean
}

export interface AnsiHtmlOptions {
  /** Wrap the result in a parent element with this class name. */
  readonly className?: string
  /** CSP nonce to apply when emitting `<style>` (currently unused — kept for forward-compat). */
  readonly cspNonce?: string
}
