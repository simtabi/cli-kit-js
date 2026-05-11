/**
 * `@simtabi/cli-kit-js-core`
 *
 * The runtime heart of cli-kit-js:
 *
 *   - `command()` / `defineCommand()` — declarative command builder
 *   - `cli('name')` — fluent OOP builder producing the same immutable config
 *   - `run(command, opts?)` — async-correct runner with:
 *       · signal matrix (SIGINT/SIGTERM/SIGHUP → AbortSignal; SIGPIPE = graceful)
 *       · exit codes (0/1/2/130/143)
 *       · hook bus (before:parse, after:parse, before:run, after:run, on:error, on:help, on:exit)
 *       · lazy subcommand loading
 *       · terminal-state guard
 *       · graceful-shutdown timeout
 *   - `logger` — leveled logger with secret-key redaction
 *   - Help generator with nested-subcommand recursion + `--help=json|markdown|man`
 *
 * Implementation lands in M3.
 */

export const __version = '0.0.0'
