/**
 * `@simtabi/cli-kit-js-testing`
 *
 * Test helpers for cli-kit-js consumers. Vitest-agnostic — the matchers throw
 * descriptive Errors, so any test runner that fails on uncaught throws
 * (Vitest, Node `test`, Mocha, Jest) works.
 */

// Re-export MemoryAdapter for convenience — most test files only need
// `@simtabi/cli-kit-js-testing` and `@simtabi/cli-kit-js-core` imports.
export { MemoryAdapter, type MemoryAdapterOptions } from '@simtabi/cli-kit-js-io'

export { answer } from './answer'
export {
  expectExitCode,
  expectNoStdout,
  expectResultType,
  expectStderr,
  expectStdout,
  type ExpectOptions,
} from './expect'
export { snapshotHelp } from './snapshot'
export { freezeTime } from './time'
export { withEnv } from './env'
