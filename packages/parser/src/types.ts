/**
 * Public types for `@simtabi/cli-kit-js-parser`.
 */

export type ArgType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'count'
  | 'positional'

export interface ArgDef {
  readonly type: ArgType
  readonly alias?: string | readonly string[]
  readonly default?: unknown
  readonly description?: string
  readonly required?: boolean
  /** Repeating option (`-I a -I b`) or repeating positional (combine with `type: 'positional'`). */
  readonly array?: boolean
  /** Marks a positional as variadic — must be the last positional declared. */
  readonly rest?: boolean
  /** Enum constraint. Coerced value must be one of these. */
  readonly values?: readonly string[]
  /** Env-var fallback if no CLI value provided. */
  readonly env?: string
}

export interface ParseOptions {
  /** Argument definitions, keyed by canonical name. */
  readonly args: Readonly<Record<string, ArgDef>>
  /** When true (default), unknown flags produce errors. */
  readonly strict?: boolean
  /** Per-call DoS caps; sensible defaults applied. */
  readonly caps?: {
    readonly maxTokens?: number
    readonly maxInputBytes?: number
  }
  /** Environment for `env` fallback resolution; defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>
}

export type ParseErrorCode =
  | 'UNKNOWN_FLAG'
  | 'UNKNOWN_OPTION'
  | 'MISSING_VALUE'
  | 'MISSING_REQUIRED'
  | 'INVALID_VALUE'
  | 'INVALID_KEY'
  | 'INVALID_ENUM'
  | 'TOO_MANY_TOKENS'
  | 'INPUT_TOO_LARGE'
  | 'POLLUTION_ATTEMPT'
  | 'BAD_DEFINITION'

export interface ParseError {
  readonly code: ParseErrorCode
  readonly message: string
  readonly token?: string
  readonly flag?: string
  readonly value?: string
  readonly position?: number
}

export interface ParseResult {
  /** Canonical-key → coerced value. */
  readonly values: Readonly<Record<string, unknown>>
  /** Positional args (excluding rest-after-`--`). */
  readonly positional: readonly string[]
  /** Tokens after the `--` separator. */
  readonly rest: readonly string[]
  /** Unknown flags encountered in non-strict mode (key without leading dashes). */
  readonly unknown: readonly string[]
}

export type ParseOutcome =
  | { readonly ok: true; readonly result: ParseResult; readonly errors: readonly [] }
  | { readonly ok: false; readonly result: ParseResult; readonly errors: readonly ParseError[] }

export const DEFAULT_CAPS = {
  maxTokens: 10_000,
  maxInputBytes: 1_048_576, // 1 MiB
} as const
