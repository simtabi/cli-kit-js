/**
 * Snapshot helpers. Renders deterministic output for use with vitest's
 * `toMatchSnapshot()` (or any snapshotting tool).
 */

import { strip } from '@simtabi/cli-kit-js-ansi'
import { type Command, renderHelp } from '@simtabi/cli-kit-js-core'

export function snapshotHelp(
  command: Command,
  format: 'text' | 'json' | 'markdown' | 'man' = 'text',
): string {
  const out = renderHelp(command, { format, colorDepth: 0 })
  // Strip any residual ANSI just in case a renderer leaks one.
  return strip(out)
}
