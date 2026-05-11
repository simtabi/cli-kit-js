import { parse } from '@simtabi/cli-kit-js-parser'
import { Bench } from 'tinybench'

const SMALL = ['--name', 'World', '-v', '--no-color']
const MEDIUM = [
  '--input',
  'src/main.ts',
  '-o',
  'dist/',
  '-vvv',
  '--mode',
  'production',
  '--',
  'extra',
  'positionals',
]
const LARGE = Array.from({ length: 200 }, (_, i) => (i % 2 ? `value-${i}` : `--flag${i}`))

const args = {
  name: { type: 'string', alias: 'n' },
  verbose: { type: 'count', alias: 'v' },
  color: { type: 'boolean' },
  input: { type: 'string' },
  output: { type: 'string', alias: 'o' },
  mode: { type: 'string' },
} as const

const bench = new Bench({ time: 500 })

bench
  .add('parse: small argv (4 tokens, strict)', () => {
    parse(SMALL, { args })
  })
  .add('parse: medium argv (~10 tokens, strict)', () => {
    parse(MEDIUM, { args })
  })
  .add('parse: 200-token argv (non-strict)', () => {
    parse(LARGE, { args: {}, strict: false })
  })

await bench.run()

console.table(bench.table())
