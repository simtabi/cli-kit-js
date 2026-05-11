/**
 * Leveled logger with structured fields and automatic secret-key redaction.
 *
 *   const log = createLogger({ io, level: 'info' })
 *   log.info('user signed in', { userId: 42 })
 *   log.error('login failed', { reason: 'bad token', token: 'abc' })
 *   // → user signed in (userId=42)
 *   // → login failed (reason="bad token" token=[REDACTED])
 *
 * Output goes through an IOAdapter, so it's TTY/DOM/console-agnostic. Level
 * gating happens before any string formatting — silent + error-only modes
 * pay essentially zero overhead for filtered calls.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter } from '@simtabi/cli-kit-js-io'

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
}

/** Default keys whose values are redacted in field output. Case-insensitive. */
export const DEFAULT_REDACT_KEYS: readonly string[] = Object.freeze([
  'password',
  'token',
  'secret',
  'key',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'credentials',
  'private_key',
  'privatekey',
])

const REDACTED = '[REDACTED]'

export interface CreateLoggerOptions {
  readonly io: IOAdapter
  readonly level?: LogLevel
  /** Override the default redact list — pattern is case-insensitive equality. */
  readonly redactKeys?: readonly string[]
  /** `'pretty'` colours by level; `'json'` emits NDJSON lines. */
  readonly format?: 'pretty' | 'json'
  /** Fields bound to every log line emitted by this logger. */
  readonly fields?: Readonly<Record<string, unknown>>
}

export interface Logger {
  readonly level: LogLevel
  error(message: string, fields?: Readonly<Record<string, unknown>>): void
  warn(message: string, fields?: Readonly<Record<string, unknown>>): void
  info(message: string, fields?: Readonly<Record<string, unknown>>): void
  debug(message: string, fields?: Readonly<Record<string, unknown>>): void
  trace(message: string, fields?: Readonly<Record<string, unknown>>): void
  /** Create a child logger with extra bound fields. */
  child(extraFields: Readonly<Record<string, unknown>>): Logger
}

export function createLogger(opts: CreateLoggerOptions): Logger {
  const level = opts.level ?? 'info'
  const format = opts.format ?? 'pretty'
  const redactKeys = (opts.redactKeys ?? DEFAULT_REDACT_KEYS).map((k) => k.toLowerCase())
  const boundFields = opts.fields ?? {}
  return makeLogger(opts.io, level, format, redactKeys, boundFields)
}

function makeLogger(
  io: IOAdapter,
  level: LogLevel,
  format: 'pretty' | 'json',
  redactKeys: readonly string[],
  boundFields: Readonly<Record<string, unknown>>,
): Logger {
  const threshold = LEVEL_ORDER[level]

  function emit(
    target: LogLevel,
    message: string,
    fields?: Readonly<Record<string, unknown>>,
  ): void {
    if (LEVEL_ORDER[target] > threshold) return
    const merged = fields ? { ...boundFields, ...fields } : boundFields
    const redacted = redactFields(merged, redactKeys)
    const line =
      format === 'json'
        ? formatJson(target, message, redacted)
        : formatPretty(target, message, redacted)
    if (target === 'error') io.writeError(`${line}\n`)
    else io.write(`${line}\n`)
  }

  return {
    level,
    error(message, fields) {
      emit('error', message, fields)
    },
    warn(message, fields) {
      emit('warn', message, fields)
    },
    info(message, fields) {
      emit('info', message, fields)
    },
    debug(message, fields) {
      emit('debug', message, fields)
    },
    trace(message, fields) {
      emit('trace', message, fields)
    },
    child(extraFields) {
      return makeLogger(io, level, format, redactKeys, { ...boundFields, ...extraFields })
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Redaction
// ──────────────────────────────────────────────────────────────────────────────

export function redactFields(
  fields: Readonly<Record<string, unknown>>,
  redactKeys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (redactKeys.includes(key.toLowerCase())) {
      out[key] = REDACTED
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redactFields(value as Record<string, unknown>, redactKeys)
    } else {
      out[key] = value
    }
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Formatting
// ──────────────────────────────────────────────────────────────────────────────

const LEVEL_TAG: Readonly<Record<Exclude<LogLevel, 'silent'>, string>> = {
  error: colors.red('ERROR'),
  warn: colors.yellow('WARN '),
  info: colors.cyan('INFO '),
  debug: colors.gray('DEBUG'),
  trace: colors.gray('TRACE'),
}

function formatPretty(
  level: LogLevel,
  message: string,
  fields: Readonly<Record<string, unknown>>,
): string {
  if (level === 'silent') return ''
  const tag = LEVEL_TAG[level as Exclude<LogLevel, 'silent'>] ?? level
  const body = `${tag} ${message}`
  const keys = Object.keys(fields)
  if (keys.length === 0) return body
  return `${body} ${colors.gray(serialiseFields(fields))}`
}

function formatJson(
  level: LogLevel,
  message: string,
  fields: Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify({
    level,
    msg: message,
    time: new Date().toISOString(),
    ...fields,
  })
}

function serialiseFields(fields: Readonly<Record<string, unknown>>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    parts.push(`${key}=${formatValue(value)}`)
  }
  return parts.join(' ')
}

function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') {
    return /[\s="]/.test(value) ? JSON.stringify(value) : value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return '[unserialisable]'
  }
}
