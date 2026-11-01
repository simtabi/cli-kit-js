#!/usr/bin/env node
/**
 * Example: streaming-style log tailer.
 *
 *   node apps/examples/src/log-tail.ts --service api --lines 8
 *
 * Demonstrates:
 *   - `createSpinner` driving a "connecting" phase that resolves to `succeed`
 *   - Streaming output: log lines printed in order, levels coloured
 *   - Box framing via `@simtabi/cli-kit-js/render` for the final summary
 */

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'
import { box, createSpinner } from '@simtabi/cli-kit-js/render'

const LEVELS = ['info', 'warn', 'error', 'debug'] as const
type Level = (typeof LEVELS)[number]

const SAMPLE_LINES = [
  'request handled',
  'db query slow',
  'rate limit near',
  'cache miss',
  'auth attempt',
  'background job ok',
] as const

function pickLine(seq: number): { readonly level: Level; readonly line: string } {
  const level = LEVELS[seq % LEVELS.length] ?? 'info'
  const line = SAMPLE_LINES[seq % SAMPLE_LINES.length] ?? 'noop'
  return { level, line }
}

function tagFor(level: Level): string {
  if (level === 'error') return colors.red(level)
  if (level === 'warn') return colors.yellow(level)
  if (level === 'debug') return colors.gray(level)
  return colors.cyan(level)
}

const logTail = defineCommand({
  meta: {
    name: 'log-tail',
    version: '0.1.0',
    description: 'Stream the most recent log lines.',
  },
  args: {
    service: {
      type: 'string',
      alias: 's',
      default: 'api',
      description: 'Service name',
    },
    lines: {
      type: 'integer',
      alias: 'n',
      default: 5,
      min: 1,
      max: 50,
      description: 'How many lines to tail',
    },
  },
  async run({ args, io, signal }) {
    const sp = createSpinner(io, { text: `connecting to ${args.service}…` })
    sp.start()
    await new Promise((r) => setTimeout(r, 250))
    sp.succeed(`connected to ${args.service}`)

    let warns = 0
    let errors = 0
    for (let i = 0; i < args.lines; i++) {
      if (signal?.aborted) {
        io.write(`${colors.yellow('cancelled')}\n`)
        return
      }
      await new Promise((r) => setTimeout(r, 60))
      const { level, line } = pickLine(i)
      if (level === 'warn') warns++
      if (level === 'error') errors++
      io.write(`[${tagFor(level)}] ${line}\n`)
    }

    io.write('\n')
    io.write(
      `${box(
        `service: ${colors.cyan(args.service)}\nlines:   ${args.lines}\nwarns:   ${warns}\nerrors:  ${errors}`,
        { style: 'round', padding: { x: 2, y: 1 }, title: 'summary' },
      )}\n`,
    )
  },
})

await run(logTail)
