#!/usr/bin/env node
/**
 * Example: subcommand tree with typed positionals.
 *
 *   node apps/examples/src/calc.ts add 5 3
 *   node apps/examples/src/calc.ts sub 10 4 --verbose
 *   node apps/examples/src/calc.ts mul 7 6
 *   node apps/examples/src/calc.ts div 20 4
 *   node apps/examples/src/calc.ts --help
 */

import { type Command, defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'

interface BinOp {
  readonly symbol: string
  readonly fn: (a: number, b: number) => number
}

const op = (symbol: string, fn: BinOp['fn']): BinOp => ({ symbol, fn })

// Explicit `Command` return + cast widens the generic-args type so the
// result fits the `SubCommands` map below (which is invariant in the
// args generic under exactOptionalPropertyTypes).
function makeBinaryCommand(name: string, description: string, { symbol, fn }: BinOp): Command {
  const cmd = defineCommand({
    meta: { name, description },
    args: {
      a: { type: 'positional', required: true, description: 'First operand' },
      b: { type: 'positional', required: true, description: 'Second operand' },
      verbose: { type: 'boolean', alias: 'v', description: 'Show the equation' },
    },
    run({ args, io }) {
      const a = Number(args.a)
      const b = Number(args.b)
      // Throw with a user-facing message — the runner's on:error path
      // emits the message to stderr. No need to pre-print.
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error('both operands must be numbers')
      }
      if (name === 'div' && b === 0) {
        throw new Error('division by zero')
      }
      const result = fn(a, b)
      if (args.verbose) {
        io.write(
          `${colors.cyan(`${a} ${symbol} ${b} =`)} ${colors.bold(colors.yellow(String(result)))}\n`,
        )
      } else {
        io.write(`${result}\n`)
      }
    },
  })
  return cmd as unknown as Command
}

const calc = defineCommand({
  meta: {
    name: 'calc',
    version: '0.1.0',
    description: 'A four-function calculator.',
    examples: ['calc add 5 3', 'calc mul 7 6 --verbose'],
  },
  subCommands: {
    add: makeBinaryCommand(
      'add',
      'a + b',
      op('+', (a, b) => a + b),
    ),
    sub: makeBinaryCommand(
      'sub',
      'a − b',
      op('−', (a, b) => a - b),
    ),
    mul: makeBinaryCommand(
      'mul',
      'a × b',
      op('×', (a, b) => a * b),
    ),
    div: makeBinaryCommand(
      'div',
      'a ÷ b',
      op('÷', (a, b) => a / b),
    ),
  },
})

await run(calc)
