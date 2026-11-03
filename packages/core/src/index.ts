/**
 * `@simtabi/cli-kit-js-core`
 *
 * The runtime heart of cli-kit-js: command definition, fluent builder, async
 * runner with signal-aware lifecycle, hook bus, help generator, lazy
 * subcommands, and "did you mean?" suggestions.
 */

// Re-export the parser's public types so consumers get the full surface from
// a single import.
export type {
  ArgDef,
  ArgType,
  ParseError,
  ParseErrorCode,
} from '@simtabi/cli-kit-js-parser'
export { type CommandBuilder, cli, defineCommand } from './define'
export { type HelpFormat, type RenderHelpOptions, renderHelp } from './help'
export { HookBus } from './hooks'
export { isLazyCommand, resolveSubCommand } from './lazy'
export {
  type CreateLoggerOptions,
  createLogger,
  DEFAULT_REDACT_KEYS,
  type Logger,
  type LogLevel,
  redactFields,
} from './logger'
export { run } from './run'
export { suggest } from './suggest'
export type {
  ArgsRecord,
  Command,
  CommandLike,
  CommandMeta,
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
