/**
 * Public types for `@simtabi/cli-kit-js-core`.
 */

import type { IOAdapter } from '@simtabi/cli-kit-js-io'
import type { ArgDef, ParseError } from '@simtabi/cli-kit-js-parser'

export interface CommandMeta {
  readonly name: string
  readonly version?: string
  readonly description?: string
  /** Hide the command in parent help listings. */
  readonly hidden?: boolean
  /** Free-text examples appended to the help screen. */
  readonly examples?: readonly string[]
}

/** Map from arg-name → ArgDef. */
export type ArgsRecord = Readonly<Record<string, ArgDef>>

/** Lazy subcommand — function returning either a Command or `{ default: Command }`. */
export type LazyCommand = () => Promise<CommandLike>

export type CommandLike = Command | { readonly default: Command }

export type SubCommands = Readonly<Record<string, Command | LazyCommand>>

export interface RunContext<A extends ArgsRecord = ArgsRecord> {
  /** Parsed and coerced argument values, typed by the schema. */
  readonly args: InferArgs<A>
  /** Positional arguments not assigned to a named positional def. */
  readonly positional: readonly string[]
  /** Tokens after the `--` separator. */
  readonly rest: readonly string[]
  /** Output adapter. */
  readonly io: IOAdapter
  /** AbortSignal flipped on SIGINT/SIGTERM/SIGHUP. */
  readonly signal: AbortSignal
  /** Full command chain (parent → child → … → this command). */
  readonly path: readonly string[]
  /** The command currently executing. */
  readonly command: Command
}

export interface Command<A extends ArgsRecord = ArgsRecord> {
  readonly meta: CommandMeta
  readonly args?: A
  readonly subCommands?: SubCommands
  /** Forbid unknown flags. Default `true`. */
  readonly strict?: boolean
  /** Run before `run`. */
  readonly setup?: (ctx: RunContext<A>) => Promise<void> | void
  /** Main action. */
  readonly run?: (ctx: RunContext<A>) => Promise<unknown> | unknown
  /** Run after `run` (always, even on error). */
  readonly cleanup?: (
    ctx: RunContext<A> & { readonly error?: unknown; readonly result?: unknown },
  ) => Promise<void> | void
  /** Plugins / middleware. */
  readonly plugins?: readonly Plugin[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Type-level inference: ArgDef → value type
// ──────────────────────────────────────────────────────────────────────────────

type InferArgType<D extends ArgDef> = D['type'] extends 'string'
  ? string
  : D['type'] extends 'integer' | 'number' | 'count'
    ? number
    : D['type'] extends 'boolean'
      ? boolean
      : D['type'] extends 'positional'
        ? string
        : unknown

type ArrayWrap<D extends ArgDef, T> = D extends { readonly array: true }
  ? readonly T[]
  : D extends { readonly rest: true }
    ? readonly T[]
    : T

/** Map an `ArgsRecord` to the typed values shape produced by the parser. */
export type InferArgs<A extends ArgsRecord> = {
  readonly [K in keyof A]: ArrayWrap<A[K], InferArgType<A[K]>>
}

// ──────────────────────────────────────────────────────────────────────────────
// Plugin / hook bus
// ──────────────────────────────────────────────────────────────────────────────

export type HookEvent =
  | 'before:parse'
  | 'after:parse'
  | 'before:run'
  | 'after:run'
  | 'on:error'
  | 'on:help'
  | 'on:exit'

export interface HookPayloads {
  readonly 'before:parse': { readonly argv: readonly string[]; readonly command: Command }
  readonly 'after:parse': {
    readonly argv: readonly string[]
    readonly command: Command
    readonly errors: readonly ParseError[]
  }
  readonly 'before:run': { readonly ctx: RunContext }
  readonly 'after:run': { readonly ctx: RunContext; readonly result: unknown }
  readonly 'on:error': { readonly ctx?: RunContext; readonly error: unknown }
  readonly 'on:help': { readonly command: Command }
  readonly 'on:exit': { readonly code: number }
}

export type HookHandler<E extends HookEvent> = (payload: HookPayloads[E]) => Promise<void> | void

export interface Plugin {
  readonly name: string
  readonly hooks: Partial<{ [E in HookEvent]: HookHandler<E> }>
}

// ──────────────────────────────────────────────────────────────────────────────
// Run result
// ──────────────────────────────────────────────────────────────────────────────

export type RunResult =
  | { readonly type: 'ok'; readonly code: 0; readonly result: unknown }
  | { readonly type: 'help'; readonly code: 0 }
  | { readonly type: 'version'; readonly code: 0 }
  | { readonly type: 'usage-error'; readonly code: 2; readonly errors: readonly ParseError[] }
  | { readonly type: 'runtime-error'; readonly code: 1; readonly error: unknown }
  | { readonly type: 'cancelled'; readonly code: 130 | 143 | 129 }

export interface RunOptions {
  readonly argv?: readonly string[]
  readonly io?: IOAdapter
  readonly signal?: AbortSignal
  /** When true (default), call `process.exit(result.code)` after run completes. */
  readonly exit?: boolean
  /** Override for tests so we don't actually exit the process. */
  readonly exitFn?: (code: number) => void
  /** When true (default in Node), install SignalController + TerminalGuard. */
  readonly installSignalsAndGuard?: boolean
  /** When true, install plugins in strict mode (a plugin throw aborts the run). */
  readonly strictPlugins?: boolean
}
