import { pad, truncate, width, wrap } from '@simtabi/cli-kit-js-text'
import { Bench } from 'tinybench'

const ASCII = 'Hello, World! '.repeat(20)
const CJK = '日本語のテストデータです。 '.repeat(15)
const EMOJI = '😀🚀✨🎉👨‍👩‍👧 '.repeat(15)
const ANSI = '\x1b[31mred\x1b[39m '.repeat(40)

const bench = new Bench({ time: 500 })

bench
  .add('width: ASCII (280 cols)', () => {
    width(ASCII)
  })
  .add('width: CJK (300 cols)', () => {
    width(CJK)
  })
  .add('width: emoji + ZWJ (~150 cols)', () => {
    width(EMOJI)
  })
  .add('width: ANSI-styled (160 cols after strip)', () => {
    width(ANSI)
  })
  .add('truncate: 100-col ASCII → 40 cols', () => {
    truncate(ASCII, 40)
  })
  .add('pad: ASCII → 80 cols (left-aligned)', () => {
    pad('hi', 80)
  })
  .add('wrap: 280-col ASCII → 40-col width', () => {
    wrap(ASCII, 40)
  })

await bench.run()

console.table(bench.table())
