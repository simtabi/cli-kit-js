/**
 * `@simtabi/cli-kit-js-io`
 *
 * The IOAdapter abstraction and its implementations. Anything cli-kit-js writes
 * goes through one of these — there is no direct `process.stdout.write` or
 * `document.body.appendChild` call elsewhere in the codebase.
 *
 * Subpath exports for tree-shaking:
 *   `@simtabi/cli-kit-js-io/node`    — Node 22+ stdio adapter
 *   `@simtabi/cli-kit-js-io/memory`  — In-memory adapter for tests
 *   `@simtabi/cli-kit-js-io/dom`     — Browser DOM adapter (M6)
 *   `@simtabi/cli-kit-js-io/console` — Browser DevTools adapter (M6)
 */

export { createNodeStdio, type NodeStdioAdapterOptions } from './node'
export { MemoryAdapter, type MemoryAdapterOptions } from './memory'
export { SignalController, type SignalControllerOptions } from './signals'
export { TerminalGuard, type TerminalGuardOptions } from './terminal-guard'
export type { IOAdapter, KeyEvent, ResizeListener } from './types'
export {
  EXIT_ERROR,
  EXIT_OK,
  EXIT_SIGINT,
  EXIT_SIGTERM,
  EXIT_USAGE,
} from './types'
