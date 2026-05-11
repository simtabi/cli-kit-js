/**
 * Public types for `@simtabi/cli-kit-js-ansi`.
 */

/** Color depth, in bits per channel-ish.
 *
 *   0  — colour disabled
 *   4  — 16 colours (basic SGR foreground/background)
 *   8  — 256 colours (`\x1b[38;5;Nm`)
 *  24  — truecolor / 16M RGB (`\x1b[38;2;R;G;Bm`)
 */
export type ColorDepth = 0 | 4 | 8 | 24

export interface DetectEnv {
  readonly env?: Readonly<Record<string, string | undefined>>
  readonly isTTY?: boolean
  readonly platform?: NodeJS.Platform | 'browser' | 'unknown'
}

export interface Capabilities {
  readonly color: ColorDepth
  readonly unicode: boolean
  readonly hyperlinks: boolean
  readonly stream: 'stdout' | 'stderr' | 'unknown'
}

export type ColorFn = (input: string) => string

export interface Colors {
  readonly depth: ColorDepth

  // Styles
  readonly reset: ColorFn
  readonly bold: ColorFn
  readonly dim: ColorFn
  readonly italic: ColorFn
  readonly underline: ColorFn
  readonly inverse: ColorFn
  readonly strikethrough: ColorFn

  // Foreground (basic 16)
  readonly black: ColorFn
  readonly red: ColorFn
  readonly green: ColorFn
  readonly yellow: ColorFn
  readonly blue: ColorFn
  readonly magenta: ColorFn
  readonly cyan: ColorFn
  readonly white: ColorFn
  readonly gray: ColorFn
  readonly brightRed: ColorFn
  readonly brightGreen: ColorFn
  readonly brightYellow: ColorFn
  readonly brightBlue: ColorFn
  readonly brightMagenta: ColorFn
  readonly brightCyan: ColorFn
  readonly brightWhite: ColorFn

  // Background
  readonly bgBlack: ColorFn
  readonly bgRed: ColorFn
  readonly bgGreen: ColorFn
  readonly bgYellow: ColorFn
  readonly bgBlue: ColorFn
  readonly bgMagenta: ColorFn
  readonly bgCyan: ColorFn
  readonly bgWhite: ColorFn

  // Higher-depth wrappers — auto-fallback when depth < required.
  readonly fg256: (n: number) => ColorFn
  readonly bg256: (n: number) => ColorFn
  readonly rgb: (r: number, g: number, b: number) => ColorFn
  readonly bgRgb: (r: number, g: number, b: number) => ColorFn
}
