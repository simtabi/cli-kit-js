#!/usr/bin/env node
/**
 * Example: schema migration runner driven by plugin hooks.
 *
 *   node apps/examples/src/migrate.ts --from 12 --to 14
 *
 * Demonstrates:
 *   - `Plugin` with `before:run` / `after:run` / `on:error` for transactional
 *     framing (open transaction → commit / rollback)
 *   - Multiple migration steps shown by a `progressBar` line
 *   - Idempotent: re-running with the same `--from`/`--to` is a no-op
 */

import { defineCommand, type Plugin, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'
import { box, progressBar } from '@simtabi/cli-kit-js/render'

interface Tx {
  open: boolean
  applied: number[]
}

// In a real CLI this would be a database handle. For the example, mutable
// closure state mirrors the lifecycle.
const tx: Tx = { open: false, applied: [] }

const txPlugin: Plugin = {
  name: 'tx',
  hooks: {
    'before:run': async ({ ctx }) => {
      tx.open = true
      tx.applied = []
      ctx.io.write(colors.gray('tx: BEGIN\n'))
    },
    'after:run': async ({ ctx }) => {
      if (tx.open) {
        ctx.io.write(colors.gray(`tx: COMMIT (${tx.applied.length} migration(s))\n`))
        tx.open = false
      }
    },
    'on:error': async ({ ctx, error }) => {
      if (tx.open) {
        const msg = error instanceof Error ? error.message : String(error)
        ctx?.io.writeError(`${colors.red('tx: ROLLBACK')} — ${msg}\n`)
        tx.open = false
      }
    },
  },
}

const migrate = defineCommand({
  meta: {
    name: 'migrate',
    version: '0.1.0',
    description: 'Apply database migrations transactionally.',
    examples: ['migrate --from 12 --to 14'],
  },
  args: {
    from: {
      type: 'integer',
      alias: 'f',
      required: true,
      min: 0,
      description: 'Current schema version',
    },
    to: {
      type: 'integer',
      alias: 't',
      required: true,
      min: 0,
      description: 'Target schema version',
    },
    dryRun: {
      type: 'boolean',
      description: 'Print migrations without applying them',
    },
  },
  async run({ args, io, signal }) {
    if (args.to < args.from) {
      throw new Error(`cannot migrate down from ${args.from} to ${args.to}`)
    }
    const total = args.to - args.from
    if (total === 0) {
      io.write(`${colors.green('nothing to do')} — already at v${args.to}\n`)
      return
    }

    for (let v = args.from + 1; v <= args.to; v++) {
      if (signal?.aborted) throw new Error('aborted')
      await new Promise((r) => setTimeout(r, 80))
      if (!args.dryRun) tx.applied.push(v)
      const done = v - args.from
      io.write(
        `\r${progressBar(done, total, { width: 32, label: `v${v - 1} → v${v}`, showPercent: true })}`,
      )
    }
    io.write('\n')

    io.write(
      `${box(
        `${args.dryRun ? colors.yellow('DRY RUN ') : ''}migrated from v${args.from} to v${args.to}\n${tx.applied.length} migration(s) applied`,
        { style: 'round', padding: { x: 2, y: 1 }, title: '✓' },
      )}\n`,
    )
  },
  plugins: [txPlugin],
})

await run(migrate)
