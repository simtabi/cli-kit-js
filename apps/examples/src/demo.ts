#!/usr/bin/env node
/**
 * Example: exercise every renderer.
 *
 *   node apps/examples/src/demo.ts            # run them all
 *   node apps/examples/src/demo.ts --only box # one at a time
 *
 * Showcases box, table, list, tree, banner, progress, spinner across
 * the standard renderers. Output is identical on Node TTY and (via the
 * DOM adapter) in the browser playground.
 */

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'
import {
  banner,
  box,
  createSpinner,
  list,
  progressBar,
  table,
  tree,
} from '@simtabi/cli-kit-js/render'

const SECTIONS = ['banner', 'box', 'table', 'list', 'tree', 'progress', 'spinner'] as const
type Section = (typeof SECTIONS)[number]

const demo = defineCommand({
  meta: {
    name: 'demo',
    version: '0.1.0',
    description: 'Demonstrate every cli-kit-js renderer.',
  },
  args: {
    only: {
      type: 'enum',
      alias: 'o',
      values: [...SECTIONS],
      description: 'Render a single section instead of all',
    },
  },
  async run({ args, io }) {
    const requested = (args.only ?? null) as Section | null
    const sections = requested ? [requested] : SECTIONS

    for (const s of sections) {
      io.write(`\n${colors.bold(colors.cyan('— ' + s + ' —'))}\n\n`)
      switch (s) {
        case 'banner':
          io.write(`${banner('cli-kit-js')}\n`)
          break
        case 'box':
          io.write(`${box('Hello, World!', { style: 'round', padding: { x: 2, y: 1 }, title: 'greeting' })}\n`)
          io.write(`\n${box(colors.green('All systems nominal.'), { style: 'double' })}\n`)
          break
        case 'table':
          io.write(
            `${table(
              [
                ['parser', '4 KB', colors.green('✓')],
                ['ansi', '2 KB', colors.green('✓')],
                ['text', '6 KB', colors.green('✓')],
                ['io', '5 KB', colors.green('✓')],
                ['render', '8 KB', colors.green('✓')],
              ],
              { headers: ['Package', 'Size', 'Built'], align: ['left', 'right', 'center'] },
            )}\n`,
          )
          break
        case 'list':
          io.write(
            `${list([
              'Top item',
              {
                text: 'Parent',
                children: ['Child A', 'Child B', { text: 'Nested', children: ['Grandchild'] }],
              },
              'Another top item',
            ])}\n`,
          )
          break
        case 'tree':
          io.write(
            `${tree({
              label: '@simtabi/cli-kit-js',
              children: [
                { label: 'parser' },
                { label: 'ansi' },
                { label: 'text' },
                { label: 'io', children: [{ label: 'node' }, { label: 'dom' }, { label: 'console' }] },
                { label: 'render', children: [{ label: 'html' }] },
                { label: 'config' },
                { label: 'core' },
                { label: 'prompts' },
              ],
            })}\n`,
          )
          break
        case 'progress':
          for (let p = 0; p <= 100; p += 20) {
            io.write(`  ${progressBar(p, 100, { width: 30, label: `step ${p / 20 + 1}` })}\n`)
          }
          break
        case 'spinner': {
          const spin = createSpinner(io, { text: 'Crunching numbers…', intervalMs: 100 })
          spin.start()
          await new Promise((r) => setTimeout(r, 1500))
          spin.succeed('Done!')
          break
        }
      }
    }
  },
})

await run(demo)
