import { ansiToHtml } from '@simtabi/cli-kit-js-render/html'
import { Bench } from 'tinybench'

const PLAIN = 'Hello, World! '.repeat(40)
const SGR = '\x1b[31mred\x1b[39m \x1b[1m\x1b[32mbold green\x1b[39m\x1b[22m '.repeat(20)
const RGB = '\x1b[38;2;255;100;50morange\x1b[39m '.repeat(40)

// Adversarial: maximum HTML-escape work + maximum SGR work.
const ADVERSARIAL = '\x1b[31m<script>alert("x")</script>\x1b[39m '.repeat(20)

const bench = new Bench({ time: 500 })

bench
  .add('ansiToHtml: plain text (560 chars)', () => {
    ansiToHtml(PLAIN)
  })
  .add('ansiToHtml: SGR (~20 runs)', () => {
    ansiToHtml(SGR)
  })
  .add('ansiToHtml: truecolor (40 runs)', () => {
    ansiToHtml(RGB)
  })
  .add('ansiToHtml: adversarial XSS payload (escapes + SGR)', () => {
    ansiToHtml(ADVERSARIAL)
  })

await bench.run()

console.table(bench.table())
