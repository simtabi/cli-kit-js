/**
 * Box-drawing characters per style. Used by `box`, `table`, and `tree`.
 */

import type { BoxStyle } from './types'

export interface BoxChars {
  readonly tl: string
  readonly tr: string
  readonly bl: string
  readonly br: string
  readonly h: string
  readonly v: string
  readonly cross: string
  readonly tDown: string
  readonly tUp: string
  readonly tLeft: string
  readonly tRight: string
}

export const BOX_CHARS: Readonly<Record<BoxStyle, BoxChars>> = Object.freeze({
  single: {
    tl: '┌',
    tr: '┐',
    bl: '└',
    br: '┘',
    h: '─',
    v: '│',
    cross: '┼',
    tDown: '┬',
    tUp: '┴',
    tLeft: '┤',
    tRight: '├',
  },
  double: {
    tl: '╔',
    tr: '╗',
    bl: '╚',
    br: '╝',
    h: '═',
    v: '║',
    cross: '╬',
    tDown: '╦',
    tUp: '╩',
    tLeft: '╣',
    tRight: '╠',
  },
  round: {
    tl: '╭',
    tr: '╮',
    bl: '╰',
    br: '╯',
    h: '─',
    v: '│',
    cross: '┼',
    tDown: '┬',
    tUp: '┴',
    tLeft: '┤',
    tRight: '├',
  },
  bold: {
    tl: '┏',
    tr: '┓',
    bl: '┗',
    br: '┛',
    h: '━',
    v: '┃',
    cross: '╋',
    tDown: '┳',
    tUp: '┻',
    tLeft: '┫',
    tRight: '┣',
  },
  ascii: {
    tl: '+',
    tr: '+',
    bl: '+',
    br: '+',
    h: '-',
    v: '|',
    cross: '+',
    tDown: '+',
    tUp: '+',
    tLeft: '+',
    tRight: '+',
  },
})

export const TREE_CHARS = Object.freeze({
  unicode: {
    branch: '├── ',
    last: '└── ',
    vertical: '│   ',
    space: '    ',
  },
  ascii: {
    branch: '+-- ',
    last: '`-- ',
    vertical: '|   ',
    space: '    ',
  },
} as const)
