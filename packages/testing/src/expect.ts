/**
 * Vitest-agnostic matchers for cli-kit-js test code.
 *
 * Each helper throws a descriptive Error on mismatch. They work with any test
 * runner (Vitest, Node `test`, Mocha) — no test framework dependency.
 */

import type { RunResult } from '@simtabi/cli-kit-js-core'
import type { MemoryAdapter } from '@simtabi/cli-kit-js-io'

export interface ExpectOptions {
  /** Optional descriptive label for the failure message. */
  readonly label?: string
}

export function expectStdout(
  io: MemoryAdapter,
  pattern: RegExp | string,
  opts: ExpectOptions = {},
): void {
  const matches =
    typeof pattern === 'string' ? io.stdout.includes(pattern) : pattern.test(io.stdout)
  if (!matches) {
    throw new Error(
      `expectStdout${opts.label ? `(${opts.label})` : ''}: ${describe(pattern)} not found.\n` +
        `--- stdout ---\n${io.stdout}\n--- end ---`,
    )
  }
}

export function expectNoStdout(
  io: MemoryAdapter,
  pattern: RegExp | string,
  opts: ExpectOptions = {},
): void {
  const matches =
    typeof pattern === 'string' ? io.stdout.includes(pattern) : pattern.test(io.stdout)
  if (matches) {
    throw new Error(
      `expectNoStdout${opts.label ? `(${opts.label})` : ''}: ${describe(pattern)} unexpectedly matched.\n` +
        `--- stdout ---\n${io.stdout}\n--- end ---`,
    )
  }
}

export function expectStderr(
  io: MemoryAdapter,
  pattern: RegExp | string,
  opts: ExpectOptions = {},
): void {
  const matches =
    typeof pattern === 'string' ? io.stderr.includes(pattern) : pattern.test(io.stderr)
  if (!matches) {
    throw new Error(
      `expectStderr${opts.label ? `(${opts.label})` : ''}: ${describe(pattern)} not found.\n` +
        `--- stderr ---\n${io.stderr}\n--- end ---`,
    )
  }
}

export function expectExitCode(result: RunResult, code: number, opts: ExpectOptions = {}): void {
  if (result.code !== code) {
    throw new Error(
      `expectExitCode${opts.label ? `(${opts.label})` : ''}: expected ${code}, got ${result.code} (type=${result.type})`,
    )
  }
}

export function expectResultType(
  result: RunResult,
  type: RunResult['type'],
  opts: ExpectOptions = {},
): void {
  if (result.type !== type) {
    throw new Error(
      `expectResultType${opts.label ? `(${opts.label})` : ''}: expected '${type}', got '${result.type}'`,
    )
  }
}

function describe(p: RegExp | string): string {
  return typeof p === 'string' ? `substring ${JSON.stringify(p)}` : `pattern ${p.toString()}`
}
