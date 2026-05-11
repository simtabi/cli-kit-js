import { createConfigFromLayers, defineSchema, safeParse } from '@simtabi/cli-kit-js-config'
import { Bench } from 'tinybench'

const schema = defineSchema({
  server: {
    port: { type: 'integer', default: 3000, min: 1, max: 65535, env: 'PORT' },
    host: { type: 'string', default: 'localhost' },
  },
  output: {
    color: { type: 'enum', values: ['auto', 'always', 'never'], default: 'auto' },
    format: { type: 'enum', values: ['text', 'json'], default: 'text' },
  },
  paths: {
    cache: { type: 'path', default: '~/.cache/myapp' },
  },
  secrets: {
    apiKey: { type: 'string', sensitive: true },
  },
})

const SMALL_JSON = JSON.stringify({ server: { port: 8080 }, output: { color: 'always' } })
const LARGE_JSON = JSON.stringify({
  server: { port: 8080, host: 'localhost' },
  output: { color: 'always', format: 'json' },
  paths: { cache: '/tmp/cache' },
  secrets: { apiKey: 'k'.repeat(256) },
  extra: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item-${i}` })),
})

const layers = [
  {
    layer: 'file:default' as const,
    path: null,
    data: { server: { port: 3000 } },
    errors: [],
  },
  {
    layer: 'file:env' as const,
    path: null,
    data: { server: { port: 4000 } },
    errors: [],
  },
]

const bench = new Bench({ time: 500 })

bench
  .add('safeParse: small JSON config', () => {
    safeParse(SMALL_JSON)
  })
  .add('safeParse: large JSON config (~5KB)', () => {
    safeParse(LARGE_JSON)
  })
  .add('createConfigFromLayers: 2 layers + schema validation', () => {
    createConfigFromLayers({ schema, env: {} }, layers)
  })

await bench.run()

console.table(bench.table())
