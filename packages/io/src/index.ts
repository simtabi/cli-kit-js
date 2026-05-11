/**
 * `@simtabi/cli-kit-js-io`
 *
 * The IOAdapter interface and its implementations. Anything the library writes
 * goes through this abstraction — there is no direct `process.stdout.write` or
 * `document.body.appendChild` call elsewhere in the codebase.
 *
 * Subpath exports:
 *   `@simtabi/cli-kit-js-io/node`    — Node 22+ stdio adapter
 *   `@simtabi/cli-kit-js-io/dom`     — Browser DOM adapter (HTML-escaped by default)
 *   `@simtabi/cli-kit-js-io/console` — Browser DevTools (`%c`) adapter
 *   `@simtabi/cli-kit-js-io/memory`  — In-process buffer for tests
 *
 * Implementation lands in M3 (`node`, `memory`) and M6 (`dom`, `console`).
 */

export const __version = '0.0.0'
