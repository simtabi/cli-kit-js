/**
 * Snapshot helpers. Renders deterministic output for use with vitest's
 * `toMatchSnapshot()` (or any snapshotting tool).
 */

import { renderHelp, type Command } from '@simtabi/cli-kit-js-core'
import { strip } from '@simtabi/cli-kit-js-ansi'

export function snapshotHelp(command: Command, format: 'text' | 'json' | 'markdown' | 'man' = 'text'): string {
  const out = renderHelp(command, { format, colorDepth: 0 })
  // Strip any residual ANSI just in case a renderer leaks one.
  return strip(out)
}
