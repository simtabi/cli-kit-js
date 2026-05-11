/**
 * `@simtabi/cli-kit-js-core`
 *
 * The runtime heart of cli-kit-js: command definition, fluent builder, async
 * runner with signal-aware lifecycle, hook bus, help generator, lazy
 * subcommands, and "did you mean?" suggestions.
 */

export { defineCommand, cli, type CommandBuilder } from './define'
export { run } from './run'
export { renderHelp, type HelpFormat, type RenderHelpOptions } from './help'
export { suggest } from './suggest'
export { HookBus } from './hooks'
export { isLazyCommand, resolveSubCommand } from './lazy'
export {
  DEFAULT_REDACT_KEYS,
  createLogger,
  redactFields,
  type CreateLoggerOptions,
  type LogLevel,
  type Logger,
} from './logger'

export type {
  ArgsRecord,
  Command,
  CommandMeta,
  CommandLike,
  HookEvent,
  HookHandler,
  HookPayloads,
  InferArgs,
  LazyCommand,
  Plugin,
  RunContext,
  RunOptions,
  RunResult,
  SubCommands,
} from './types'

// Re-export the parser's public types so consumers get the full surface from
// a single import.
export type {
  ArgDef,
  ArgType,
  ParseError,
  ParseErrorCode,
} from '@simtabi/cli-kit-js-parser'
