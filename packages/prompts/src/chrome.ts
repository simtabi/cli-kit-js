/**
 * Display-only chrome for wizards and prompt groups.
 *
 *   intro(io, 'Project setup')
 *   →   ┌  Project setup
 *
 *   note(io, 'You can press Esc to go back.')
 *   →   │  You can press Esc to go back.
 *
 *   outro(io, 'Done!')
 *   →   └  Done!
 *
 * Uses Unicode box-drawing glyphs when `capabilities.unicode` is on,
 * ASCII fallbacks otherwise. Honours `colors.gray` for the rail.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter } from '@simtabi/cli-kit-js-io'

interface ChromeGlyphs {
  readonly top: string
  readonly mid: string
  readonly bottom: string
}

function chromeGlyphs(io: IOAdapter): ChromeGlyphs {
  if (io.capabilities.unicode) {
    return { top: '┌', mid: '│', bottom: '└' }
  }
  return { top: ',', mid: '|', bottom: '`' }
}

/** Render a top-bracket header line. Idiomatic at the start of a wizard. */
export function intro(io: IOAdapter, message: string): void {
  const g = chromeGlyphs(io)
  io.write(`${colors.gray(g.top)}  ${colors.bold(message)}\n${colors.gray(g.mid)}\n`)
}

/** Render a mid-rail note. Use for hints, sub-headers, or guidance. */
export function note(io: IOAdapter, message: string): void {
  const g = chromeGlyphs(io)
  for (const line of message.split('\n')) {
    io.write(`${colors.gray(g.mid)}  ${line}\n`)
  }
}

/** Render a closing rail line. Idiomatic at the end of a wizard / form. */
export function outro(io: IOAdapter, message: string): void {
  const g = chromeGlyphs(io)
  io.write(`${colors.gray(g.bottom)}  ${colors.bold(message)}\n`)
}

/** Render a single mid-rail line with no content (a visual pause). */
export function rail(io: IOAdapter): void {
  const g = chromeGlyphs(io)
  io.write(`${colors.gray(g.mid)}\n`)
}
