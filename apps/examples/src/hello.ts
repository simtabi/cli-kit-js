#!/usr/bin/env node
/**
 * Example: basic command with typed args + colored output.
 *
 *   node apps/examples/src/hello.ts --help
 *   node apps/examples/src/hello.ts --name Claude
 *   node apps/examples/src/hello.ts -n Claude --shout
 */

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'

const hello = defineCommand({
  meta: {
    name: 'hello',
    version: '0.1.0',
    description: 'A friendly greeter.',
    examples: ['hello --name World', 'hello -n Claude --shout'],
  },
  args: {
    name: {
      type: 'string',
      alias: 'n',
      default: 'World',
      description: 'Who to greet',
    },
    shout: {
      type: 'boolean',
      alias: 's',
      description: 'SHOUT THE GREETING',
    },
    times: {
      type: 'integer',
      alias: 't',
      default: 1,
      min: 1,
      max: 10,
      description: 'How many times to repeat',
    },
  },
  run({ args, io }) {
    const greeting = `Hello, ${args.name}!`
    const out = args.shout ? greeting.toUpperCase() : greeting
    for (let i = 0; i < args.times; i++) {
      io.write(`${colors.green(out)}\n`)
    }
  },
})

await run(hello)
