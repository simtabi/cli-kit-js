/**
 * Public types for `@simtabi/cli-kit-js-config`.
 */

export type FieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'path'
  | 'url'
  | 'array'
  | 'object'
  | 'json'

export interface FieldDef {
  readonly type: FieldType
  readonly default?: unknown
  readonly required?: boolean
  readonly description?: string

  // Constraints
  readonly min?: number
  readonly max?: number
  readonly pattern?: string
  readonly values?: readonly string[]
  readonly items?: FieldType

  // External bindings
  readonly env?: string | readonly string[]
  readonly cli?: string

  // Metadata
  readonly sensitive?: boolean
  readonly secret?: boolean
  readonly deprecated?: string

  // Path-type options
  readonly expandUser?: boolean
}

export type Schema = {
  readonly [key: string]: FieldDef | Schema
}

export type SchemaLayer =
  | 'defaults'
  | 'file:default'
  | 'file:env'
  | 'file:env.local'
  | 'file:local'
  | 'env'
  | 'cli'
  | 'runtime'

export interface CreateConfigOptions {
  readonly schema: Schema
  readonly configDir?: string
  readonly environment?: string
  readonly cli?: Readonly<Record<string, unknown>>
  readonly envPrefix?: string
  readonly env?: Readonly<Record<string, string | undefined>>
  readonly strict?: boolean
  readonly freezeAfterLoad?: boolean
  readonly maxFileBytes?: number
  readonly maxTotalBytes?: number
  /**
   * When true, captures every successful `set()` / `reset()` / `assign()`
   * in a bounded ring buffer (default 1000 entries; configurable via
   * `auditCapacity`). Inspect with `config.auditLog()`.
   *
   * Values whose schema field is marked `sensitive` or `secret` are
   * redacted to `'[REDACTED]'` in the captured entry.
   */
  readonly audit?: boolean
  /** Maximum number of audit-log entries retained. Default 1000. */
  readonly auditCapacity?: number
}

export interface AuditEntry {
  readonly at: string // ISO timestamp
  readonly op: 'set' | 'reset' | 'resetAll'
  readonly path: string
  readonly previous: unknown
  readonly next: unknown
}

export interface ConfigValidationError {
  readonly code: 'INVALID_VALUE' | 'UNKNOWN_KEY' | 'MISSING_REQUIRED' | 'POLLUTION_ATTEMPT'
  readonly path: string
  readonly message: string
  readonly layer?: SchemaLayer
}

export interface SourceInfo {
  readonly layer: SchemaLayer
  readonly value: unknown
}

export type ChangeHandler = (path: string, previous: unknown, next: unknown) => void

export interface ConfigInstance {
  /** Read a value by dot-path. */
  get<T = unknown>(path: string, defaultValue?: T): T
  /** Mutate a value at runtime (layer 'runtime'). */
  set(
    path: string,
    value: unknown,
  ): { readonly ok: true } | { readonly ok: false; readonly error: ConfigValidationError }
  /** Deep-merge a patch into the runtime layer. */
  assign(patch: Readonly<Record<string, unknown>>): readonly ConfigValidationError[]
  /** Revert one path back to its file-loaded value. */
  reset(path: string): void
  /** Revert all runtime overrides. */
  resetAll(): void
  /** Frozen deep copy. `redactSensitive: true` replaces sensitive values with '[REDACTED]'. */
  snapshot(opts?: { readonly redactSensitive?: boolean }): Readonly<Record<string, unknown>>
  /** Where did this value come from? */
  source(path: string): SourceInfo
  /** Subscribe to change events. Returns an unsubscribe function. */
  on(event: 'change', handler: ChangeHandler): () => void
  onPath(path: string, handler: (prev: unknown, next: unknown) => void): () => void
  /** Validation errors collected at load time (only non-empty when strict=false). */
  readonly validationErrors: readonly ConfigValidationError[]
  /**
   * Bounded audit log of mutation operations. Empty array when
   * `audit: true` wasn't set on `createConfig`. Sensitive/secret fields
   * are redacted to `'[REDACTED]'`.
   */
  auditLog(): readonly AuditEntry[]
}

export const DEFAULT_MAX_FILE_BYTES = 1_048_576 // 1 MiB
export const DEFAULT_MAX_TOTAL_BYTES = 4_194_304 // 4 MiB
