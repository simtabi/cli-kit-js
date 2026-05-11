/**
 * Master benchmark runner — runs every suite in sequence so a single
 * `pnpm bench` produces a complete report.
 */

import { spawnSync } from 'node:child_process'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SUITES = ['parser.ts', 'text.ts', 'render.ts', 'html.ts', 'config.ts']

for (const file of SUITES) {
  process.stdout.write(`\n=== ${file} ===\n`)
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', path.join(HERE, file)],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) {
    process.stderr.write(`bench ${file} failed\n`)
    process.exit(result.status ?? 1)
  }
}
