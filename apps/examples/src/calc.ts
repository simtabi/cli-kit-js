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

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'

interface BinOp {
  readonly symbol: string
  readonly fn: (a: number, b: number) => number
}

const op = (symbol: string, fn: BinOp['fn']): BinOp => ({ symbol, fn })

function makeBinaryCommand(name: string, description: string, { symbol, fn }: BinOp) {
  return defineCommand({
    meta: { name, description },
    args: {
      a: { type: 'positional', required: true, description: 'First operand' },
      b: { type: 'positional', required: true, description: 'Second operand' },
      verbose: { type: 'boolean', alias: 'v', description: 'Show the equation' },
    },
    run({ args, io }) {
      const a = Number(args.a)
      const b = Number(args.b)
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        io.writeError(`${colors.red('error:')} both operands must be numbers\n`)
        throw new Error('invalid input')
      }
      if (name === 'div' && b === 0) {
        io.writeError(`${colors.red('error:')} division by zero\n`)
        throw new Error('div by zero')
      }
      const result = fn(a, b)
      if (args.verbose) {
        io.write(`${colors.cyan(`${a} ${symbol} ${b} =`)} ${colors.bold(colors.yellow(String(result)))}\n`)
      } else {
        io.write(`${result}\n`)
      }
    },
  })
}

const calc = defineCommand({
  meta: {
    name: 'calc',
    version: '0.1.0',
    description: 'A four-function calculator.',
    examples: ['calc add 5 3', 'calc mul 7 6 --verbose'],
  },
  subCommands: {
    add: makeBinaryCommand('add', 'a + b', op('+', (a, b) => a + b)),
    sub: makeBinaryCommand('sub', 'a − b', op('−', (a, b) => a - b)),
    mul: makeBinaryCommand('mul', 'a × b', op('×', (a, b) => a * b)),
    div: makeBinaryCommand('div', 'a ÷ b', op('÷', (a, b) => a / b)),
  },
})

await run(calc)
