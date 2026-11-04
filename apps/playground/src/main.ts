/**
 * Browser playground entry point.
 *
 * Demonstrates the cli-kit-js DOM adapter rendering box, table, progress,
 * spinner, and an ANSI-coloured banner inside a target div. Strict CSP
 * compatible — no inline scripts, no innerHTML.
 */

import { colors } from '@simtabi/cli-kit-js/ansi'
import { banner, box, createSpinner, progressBar, table, tree } from '@simtabi/cli-kit-js/render'
import { createDomAdapter } from '@simtabi/cli-kit-js-io/dom'

const terminal = document.querySelector<HTMLDivElement>('#terminal')
if (!terminal) {
  throw new Error('playground: #terminal element not found')
}

terminal.textContent = ''
const io = createDomAdapter({ mount: terminal, columns: 100, rows: 32 })

io.write(`${banner('cli-kit-js playground')}\n\n`)

io.write(
  `${box('Mounted via DOM adapter — every char HTML-escaped, every span style allowlisted.', {
    style: 'round',
    padding: { x: 2, y: 1 },
  })}\n\n`,
)

io.write(
  `${table(
    [
      [colors.cyan('parser'), '4 KB', '✓'],
      [colors.cyan('ansi'), '2 KB', '✓'],
      [colors.cyan('text'), '6 KB', '✓'],
      [colors.cyan('io'), '5 KB', '✓'],
      [colors.cyan('render'), '8 KB', '✓'],
    ],
    { headers: ['Package', 'Size (gzip)', 'Status'] },
  )}\n\n`,
)

io.write(
  `${tree({
    label: '@simtabi/cli-kit-js',
    children: [
      { label: 'parser' },
      { label: 'ansi' },
      { label: 'text' },
      {
        label: 'io',
        children: [{ label: 'node' }, { label: 'dom' }, { label: 'console' }],
      },
      { label: 'render', children: [{ label: 'html' }] },
      { label: 'config' },
      { label: 'core' },
      { label: 'prompts' },
    ],
  })}\n\n`,
)

io.write(`${colors.bold('Progress demo:')}\n`)
for (let p = 0; p <= 100; p += 20) {
  io.write(`  ${progressBar(p, 100, { width: 30, label: `step ${p / 20 + 1}` })}\n`)
}

io.write(`\n${colors.bold('Spinner demo:')}\n`)
const spin = createSpinner(io, { text: 'Loading…', intervalMs: 120 })
spin.start()
setTimeout(() => spin.succeed('Done!'), 1500)
