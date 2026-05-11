/**
 * The async-correct command runner.
 *
 * Pipeline:
 *
 *   1. Resolve I/O adapter (default: NodeStdioAdapter).
 *   2. Install SignalController + TerminalGuard unless `installSignalsAndGuard: false`.
 *   3. Walk argv looking for a subcommand chain, lazy-loading as needed.
 *   4. Fire `before:parse` → parse argv against the resolved command's args.
 *   5. Fire `after:parse`. If parse errors, emit usage and return `usage-error`.
 *   6. Handle `--help` / `-h` (with `--help=json|markdown|man` formats) and
 *      `--version` / `-V`.
 *   7. Run `setup` → `run` → `cleanup` (cleanup always runs).
 *   8. Fire `on:exit` and return the typed `RunResult`.
 *
 * Errors are caught at every stage and routed to the corresponding hook;
 * they do not throw out of `run()`. Cancellation via SIGINT/SIGTERM produces
 * a `cancelled` result with the conventional UNIX exit code.
 */

import { parse, type ParseError } from '@simtabi/cli-kit-js-parser'
import {
  EXIT_ERROR,
  EXIT_SIGHUP,
  EXIT_SIGINT,
  EXIT_SIGTERM,
  EXIT_USAGE,
  type IOAdapter,
  SignalController,
  TerminalGuard,
  createNodeStdio,
} from '@simtabi/cli-kit-js-io'
import { renderHelp, type HelpFormat } from './help'
import { HookBus } from './hooks'
import { resolveSubCommand } from './lazy'
import { suggest } from './suggest'
import type {
  ArgsRecord,
  Command,
  RunContext,
  RunOptions,
  RunResult,
} from './types'

export async function run<A extends ArgsRecord>(
  command: Command<A>,
  opts: RunOptions = {},
): Promise<RunResult> {
  const io = opts.io ?? createNodeStdio()
  const installEnv = opts.installSignalsAndGuard !== false && !opts.io && !opts.signal

  let signalController: SignalController | null = null
  let terminalGuard: TerminalGuard | null = null
  let signal = opts.signal
  if (signal === undefined) {
    if (installEnv) {
      signalController = new SignalController()
      signal = signalController.signal
      terminalGuard = new TerminalGuard()
      terminalGuard.install()
    } else {
      // Non-installing path with no explicit signal: never aborts.
      signal = new AbortController().signal
    }
  }

  const argv = opts.argv ?? readArgv()
  const bus = new HookBus({ strict: opts.strictPlugins, io })
  if (command.plugins) bus.register(command.plugins)

  let result: RunResult
  try {
    result = await runInternal(command, argv, io, signal, bus, [command.meta.name])
  } catch (error: unknown) {
    // Should never happen — runInternal catches everything — but defensive.
    await bus.emit('on:error', { error })
    result = { type: 'runtime-error', code: EXIT_ERROR as 1, error }
  } finally {
    signalController?.dispose()
    terminalGuard?.restore()
  }

  await bus.emit('on:exit', { code: result.code })
  if (opts.exit !== false) {
    const exitFn = opts.exitFn ?? defaultExit
    // Successful runs return so the event loop can drain naturally;
    // only call exit for non-zero codes.
    if (result.code !== 0) exitFn(result.code)
  }
  return result
}

async function runInternal<A extends ArgsRecord>(
  command: Command<A>,
  argv: readonly string[],
  io: IOAdapter,
  signal: AbortSignal,
  bus: HookBus,
  path: readonly string[],
): Promise<RunResult> {
  // 1. Subcommand routing — only if the current command has subcommands and
  //    the first non-flag token names one of them.
  if (command.subCommands) {
    const subIdx = findFirstNonFlag(argv)
    if (subIdx !== -1) {
      const candidate = argv[subIdx]
      if (candidate !== undefined) {
        const resolved = await resolveSubCommand(command.subCommands, candidate)
        if (resolved) {
          // Recurse with argv after the subcommand name
          const childArgv = argv.slice(subIdx + 1)
          return runInternal(resolved, childArgv, io, signal, bus, [...path, candidate])
        }
        // Unknown subcommand — emit a "did you mean" hint and exit usage.
        const names = Object.keys(command.subCommands)
        const hints = suggest(candidate, names)
        io.writeError(`Unknown command: ${candidate}\n`)
        if (hints.length > 0) {
          io.writeError(`Did you mean: ${hints.join(', ')}?\n`)
        }
        io.writeError('\n')
        io.writeError(renderHelp(command, { path: [...path] }))
        io.writeError('\n')
        return { type: 'usage-error', code: EXIT_USAGE as 2, errors: [] }
      }
    }
  }

  // 2. Early help / version intercept BEFORE strict parsing — so an
  //    otherwise-invalid command line can still produce help.
  const helpRequest = findHelpFlag(argv)
  if (helpRequest) {
    await bus.emit('on:help', { command })
    io.write(renderHelp(command, { path, format: helpRequest.format }))
    io.write('\n')
    return { type: 'help', code: 0 }
  }
  if (findVersionFlag(argv) && command.meta.version) {
    io.write(`${command.meta.version}\n`)
    return { type: 'version', code: 0 }
  }

  // 3. Parse
  await bus.emit('before:parse', { argv, command })
  const parseResult = parse(argv, {
    args: command.args ?? {},
    strict: command.strict !== false,
  })
  await bus.emit('after:parse', { argv, command, errors: parseResult.errors })

  if (!parseResult.ok) {
    emitParseErrors(parseResult.errors, io, command, path)
    return { type: 'usage-error', code: EXIT_USAGE as 2, errors: parseResult.errors }
  }

  // 4. Build context
  const ctx: RunContext<A> = {
    args: parseResult.result.values as RunContext<A>['args'],
    positional: parseResult.result.positional,
    rest: parseResult.result.rest,
    io,
    signal,
    path,
    command,
  }

  // 5. Run setup → run → cleanup
  await bus.emit('before:run', { ctx: ctx as RunContext })
  let runError: unknown = undefined
  let runResult: unknown = undefined
  try {
    if (command.setup) await command.setup(ctx)
    if (signal.aborted) return cancelledFromSignal(signal)
    if (command.run) {
      runResult = await command.run(ctx)
    }
    if (signal.aborted) return cancelledFromSignal(signal)
  } catch (error: unknown) {
    runError = error
  } finally {
    if (command.cleanup) {
      try {
        await command.cleanup({ ...ctx, error: runError, result: runResult })
      } catch (cleanupErr) {
        if (runError === undefined) runError = cleanupErr
      }
    }
  }

  if (runError !== undefined) {
    await bus.emit('on:error', { ctx: ctx as RunContext, error: runError })
    const msg = runError instanceof Error ? runError.message : String(runError)
    io.writeError(`Error: ${msg}\n`)
    return { type: 'runtime-error', code: EXIT_ERROR as 1, error: runError }
  }

  await bus.emit('after:run', { ctx: ctx as RunContext, result: runResult })
  return { type: 'ok', code: 0, result: runResult }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const HELP_FORMATS: ReadonlySet<HelpFormat> = new Set(['text', 'json', 'markdown', 'man'])

function findHelpFlag(argv: readonly string[]): { format: HelpFormat } | null {
  for (const token of argv) {
    if (token === '--' ) return null
    if (token === '--help' || token === '-h') return { format: 'text' }
    if (token.startsWith('--help=')) {
      const v = token.slice('--help='.length) as HelpFormat
      return { format: HELP_FORMATS.has(v) ? v : 'text' }
    }
  }
  return null
}

function findVersionFlag(argv: readonly string[]): boolean {
  for (const token of argv) {
    if (token === '--') return false
    if (token === '--version' || token === '-V') return true
  }
  return false
}

function findFirstNonFlag(argv: readonly string[]): number {
  // We don't know which options take values without inspecting the command's
  // args, but for subcommand routing the heuristic is: the first bare
  // identifier (no leading dash, not the value of a `--key=value` pair) that
  // names a registered subcommand wins. Caller filters by `subCommands`.
  let skipNext = false
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === undefined) continue
    if (t === '--') return -1
    if (skipNext) {
      skipNext = false
      continue
    }
    if (t.startsWith('--')) {
      if (!t.includes('=')) {
        // Could be a boolean flag or take a value; we accept the next bare
        // identifier as the subcommand candidate regardless.
      }
      continue
    }
    if (t.startsWith('-') && t.length > 1) continue
    return i
  }
  return -1
}

function emitParseErrors(
  errors: readonly ParseError[],
  io: IOAdapter,
  command: Command,
  path: readonly string[],
): void {
  for (const e of errors) {
    io.writeError(`${e.message}\n`)
    if (e.code === 'UNKNOWN_FLAG' && command.args && e.flag) {
      const names = Object.keys(command.args)
      const hints = suggest(e.flag, names)
      if (hints.length > 0) {
        io.writeError(`Did you mean: ${hints.map((h) => `--${h}`).join(', ')}?\n`)
      }
    }
  }
  io.writeError('\n')
  io.writeError(renderHelp(command, { path }))
  io.writeError('\n')
}

function cancelledFromSignal(signal: AbortSignal): RunResult {
  // Best-effort code derivation from the abort reason set by SignalController.
  const reason =
    signal.reason && typeof signal.reason === 'object' && 'message' in signal.reason
      ? String((signal.reason as { message: unknown }).message)
      : ''
  if (reason.includes('SIGTERM')) return { type: 'cancelled', code: EXIT_SIGTERM as 143 }
  if (reason.includes('SIGHUP')) return { type: 'cancelled', code: EXIT_SIGHUP as 129 }
  return { type: 'cancelled', code: EXIT_SIGINT as 130 }
}

function readArgv(): readonly string[] {
  if (typeof process !== 'undefined' && Array.isArray(process.argv)) {
    return process.argv.slice(2)
  }
  return []
}

function defaultExit(code: number): void {
  if (typeof process !== 'undefined') process.exit(code)
}
