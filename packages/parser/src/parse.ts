/**
 * argv → typed parsed args.
 *
 * Fixes the documented bugs of the legacy `universal-cli.js` parser:
 *
 *   - Alias canonicalization in the documented direction: `alias: { name: 'n' }`
 *     places the value on `.name`, not `.n`.
 *   - Negative numbers accepted as option values (`--count -5`).
 *   - Boolean coercion symmetric for true/1/yes/y/on and false/0/no/n/off.
 *   - `--no-<flag>` works without prior boolean registration.
 *   - Short-cluster flags handle value-taking options (`-n5`, `-abc` where
 *     `b` takes a value).
 *   - Prototype-pollution defenses on every key write.
 *   - DoS caps on argv length and total input bytes.
 *   - Strict mode rejects unknown flags by default.
 */

import { coerceForType, isEnumValid } from './coerce'
import { isAllowedKey, nullObject, safeSet } from './keys'
import {
  type ArgDef,
  DEFAULT_CAPS,
  type ParseError,
  type ParseErrorCode,
  type ParseOptions,
  type ParseOutcome,
  type ParseResult,
} from './types'

// ──────────────────────────────────────────────────────────────────────────────
// Alias map
// ──────────────────────────────────────────────────────────────────────────────

interface CanonicalIndex {
  /** alias-or-canonical → canonical name. */
  readonly toCanonical: ReadonlyMap<string, string>
  /** canonical → ArgDef (with derived metadata). */
  readonly byName: ReadonlyMap<string, ArgDef>
  /** Positional defs in declaration order. */
  readonly positionals: readonly { readonly name: string; readonly def: ArgDef }[]
}

function buildIndex(defs: Readonly<Record<string, ArgDef>>): CanonicalIndex {
  const toCanonical = new Map<string, string>()
  const byName = new Map<string, ArgDef>()
  const positionals: { name: string; def: ArgDef }[] = []

  for (const [name, def] of Object.entries(defs)) {
    if (!isAllowedKey(name)) {
      throw new Error(`Invalid arg name: ${JSON.stringify(name)}`)
    }
    byName.set(name, def)
    toCanonical.set(name, name)
    if (def.alias != null) {
      const aliases = Array.isArray(def.alias) ? def.alias : [def.alias]
      for (const alias of aliases) {
        if (!isAllowedKey(alias)) {
          throw new Error(`Invalid alias: ${JSON.stringify(alias)}`)
        }
        toCanonical.set(alias, name)
      }
    }
    if (def.type === 'positional') {
      positionals.push({ name, def })
    }
  }

  // Validate: at most one rest positional, and it must be last.
  for (let i = 0; i < positionals.length; i++) {
    const cur = positionals[i]
    if (cur?.def.rest && i !== positionals.length - 1) {
      throw new Error(`Rest positional "${cur.name}" must be declared last`)
    }
  }

  return { toCanonical, byName, positionals }
}

// ──────────────────────────────────────────────────────────────────────────────
// Cap checks
// ──────────────────────────────────────────────────────────────────────────────

const UTF8 = new TextEncoder()

function checkCaps(argv: readonly string[], opts: ParseOptions['caps']): ParseError | null {
  const maxTokens = opts?.maxTokens ?? DEFAULT_CAPS.maxTokens
  const maxBytes = opts?.maxInputBytes ?? DEFAULT_CAPS.maxInputBytes
  if (argv.length > maxTokens) {
    return {
      code: 'TOO_MANY_TOKENS',
      message: `argv has ${argv.length} tokens; cap is ${maxTokens}`,
    }
  }
  let bytes = 0
  for (const t of argv) {
    bytes += UTF8.encode(t).length
    if (bytes > maxBytes) {
      return {
        code: 'INPUT_TOO_LARGE',
        message: `argv exceeds ${maxBytes} bytes`,
      }
    }
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Value assignment with array support
// ──────────────────────────────────────────────────────────────────────────────

function assignValue(
  values: Record<string, unknown>,
  canonical: string,
  def: ArgDef,
  value: unknown,
): void {
  if (def.array) {
    const cur = values[canonical]
    const arr = Array.isArray(cur) ? cur.slice() : []
    arr.push(value)
    safeSet(values, canonical, arr)
  } else {
    safeSet(values, canonical, value)
  }
}

function assignCount(values: Record<string, unknown>, canonical: string, by: number): void {
  const cur = values[canonical]
  const next = (typeof cur === 'number' ? cur : 0) + by
  safeSet(values, canonical, next)
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Decide whether `next` is acceptable as the value for an option that needs one.
 * Accepts:
 *   - any token not starting with '-'
 *   - lone '-' (often means stdin)
 *   - negative numeric literals like '-5', '-3.14', '-1e3'
 */
function looksLikeValue(next: string | undefined): boolean {
  if (next === undefined) return false
  if (next === '-') return true
  if (!next.startsWith('-')) return true
  // Negative number heuristic
  return /^-(?:\d|\.\d)/.test(next)
}

function makeError(
  code: ParseErrorCode,
  message: string,
  extra: Partial<Pick<ParseError, 'flag' | 'value' | 'token' | 'position'>> = {},
): ParseError {
  return { code, message, ...extra }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parse
// ──────────────────────────────────────────────────────────────────────────────

export function parse(argv: readonly string[], options: ParseOptions): ParseOutcome {
  // 0. Cap check
  const capErr = checkCaps(argv, options.caps)
  if (capErr) {
    return {
      ok: false,
      result: emptyResult(),
      errors: [capErr],
    }
  }

  // 1. Build index (throws on bad definition)
  let index: CanonicalIndex
  try {
    index = buildIndex(options.args)
  } catch (e: unknown) {
    return {
      ok: false,
      result: emptyResult(),
      errors: [
        makeError('BAD_DEFINITION', e instanceof Error ? e.message : 'invalid arg definitions'),
      ],
    }
  }

  const strict = options.strict !== false // default true
  const env = options.env ?? processEnvOrEmpty()
  const errors: ParseError[] = []
  const values = nullObject<Record<string, unknown>>()
  const positional: string[] = []
  const rest: string[] = []
  const unknown: string[] = []

  // 2. Apply defaults from definitions
  for (const [name, def] of index.byName) {
    if (def.default !== undefined) {
      safeSet(values, name, def.default)
    } else if (def.type === 'count') {
      safeSet(values, name, 0)
    } else if (def.array) {
      safeSet(values, name, [])
    }
  }

  // 3. Walk argv
  let afterSep = false
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === undefined) continue

    if (afterSep) {
      rest.push(token)
      continue
    }

    if (token === '--') {
      afterSep = true
      continue
    }

    if (token === '-' || token === '' || !token.startsWith('-')) {
      positional.push(token)
      continue
    }

    // Long flag: --foo, --foo=bar, --no-foo
    if (token.startsWith('--')) {
      const eq = token.indexOf('=')
      const rawKey = eq > -1 ? token.slice(2, eq) : token.slice(2)
      const inline = eq > -1 ? token.slice(eq + 1) : undefined

      // --no-X
      if (rawKey.startsWith('no-') && rawKey.length > 3) {
        const target = rawKey.slice(3)
        const canonical = index.toCanonical.get(target)
        if (canonical) {
          const def = index.byName.get(canonical)
          if (def?.type === 'count') {
            safeSet(values, canonical, 0)
          } else if (def?.array) {
            safeSet(values, canonical, [])
          } else {
            assignValue(values, canonical, def ?? { type: 'boolean' }, false)
          }
          continue
        }
        // Fall through — maybe "no-X" is itself a registered key.
      }

      const canonical = index.toCanonical.get(rawKey)
      if (canonical === undefined) {
        if (strict) {
          errors.push(
            makeError('UNKNOWN_FLAG', `unknown flag: --${rawKey}`, {
              flag: rawKey,
              position: i,
            }),
          )
        } else if (isAllowedKey(rawKey)) {
          unknown.push(rawKey)
          safeSet(values, rawKey, inline ?? true)
        } else {
          // Forbidden key name; refuse silently in non-strict, error in strict
          errors.push(
            makeError('POLLUTION_ATTEMPT', `forbidden flag name: --${rawKey}`, {
              flag: rawKey,
              position: i,
            }),
          )
        }
        continue
      }

      const def = index.byName.get(canonical)
      if (!def) continue // unreachable in practice

      // Consume value depending on type
      const valueRes = consumeValue(def, inline, argv, i)
      i = valueRes.nextIndex
      if (valueRes.error) {
        errors.push(valueRes.error)
        continue
      }
      const coerced = valueRes.value
      if (def.values && !isEnumValid(def, coerced)) {
        errors.push(
          makeError(
            'INVALID_ENUM',
            `--${rawKey}: value "${String(coerced)}" is not one of ${def.values.join(', ')}`,
            { flag: rawKey, value: String(coerced), position: i },
          ),
        )
        continue
      }
      if (def.type === 'count') {
        // Inline value treated as absolute count
        if (typeof coerced === 'number') {
          safeSet(values, canonical, coerced)
        } else {
          assignCount(values, canonical, 1)
        }
      } else {
        assignValue(values, canonical, def, coerced)
      }
      continue
    }

    // Short flag(s): -a, -abc, -n5, -n=5
    if (token.length > 1) {
      const chars = token.slice(1)
      // -n=value form
      const eq = chars.indexOf('=')
      const head = eq > -1 ? chars.slice(0, eq) : chars
      const inlineAfterEq = eq > -1 ? chars.slice(eq + 1) : undefined

      let consumedNext = false
      for (let j = 0; j < head.length; j++) {
        const ch = head[j]
        if (ch === undefined) continue
        const canonical = index.toCanonical.get(ch)
        if (canonical === undefined) {
          if (strict) {
            errors.push(
              makeError('UNKNOWN_FLAG', `unknown flag: -${ch}`, {
                flag: ch,
                position: i,
              }),
            )
          } else if (isAllowedKey(ch)) {
            unknown.push(ch)
            safeSet(values, ch, true)
          }
          continue
        }
        const def = index.byName.get(canonical)
        if (!def) continue

        if (def.type === 'boolean') {
          assignValue(values, canonical, def, true)
          continue
        }
        if (def.type === 'count') {
          assignCount(values, canonical, 1)
          continue
        }

        // Needs a value. Inline = remainder of cluster (after this char),
        // optionally minus the '=' delimiter. If at end of cluster, look at
        // the next argv token.
        let inline: string | undefined
        if (j + 1 < head.length) {
          inline = head.slice(j + 1)
          j = head.length // exit loop
        } else if (inlineAfterEq !== undefined) {
          inline = inlineAfterEq
        }

        const valueRes = consumeValue(def, inline, argv, i)
        if (inline === undefined) {
          i = valueRes.nextIndex
          consumedNext = true
        }
        if (valueRes.error) {
          errors.push(valueRes.error)
          continue
        }
        const coerced = valueRes.value
        if (def.values && !isEnumValid(def, coerced)) {
          errors.push(
            makeError(
              'INVALID_ENUM',
              `-${ch}: value "${String(coerced)}" is not one of ${def.values.join(', ')}`,
              { flag: ch, value: String(coerced), position: i },
            ),
          )
          continue
        }
        assignValue(values, canonical, def, coerced)
      }
      if (consumedNext) continue
    }

    // Lone '-' already handled above as positional.
  }

  // 4. Map positionals to declared positional args
  mapPositionals(index.positionals, positional, values, errors)

  // 5. Env-var fallback for any option still missing
  for (const [name, def] of index.byName) {
    if (def.type === 'positional') continue
    if (values[name] !== undefined && values[name] !== def.default) continue
    if (!def.env) continue
    const envVal = env[def.env]
    if (envVal === undefined) continue
    const c = coerceForType(envVal, def.type)
    if (c.ok) {
      assignValue(values, name, def, c.value)
    } else {
      errors.push(
        makeError('INVALID_VALUE', `env ${def.env}: ${c.reason}`, { flag: name, value: envVal }),
      )
    }
  }

  // 6. Required validation
  for (const [name, def] of index.byName) {
    if (!def.required) continue
    const v = values[name]
    if (v === undefined || (Array.isArray(v) && v.length === 0)) {
      errors.push(
        makeError(
          def.type === 'positional' ? 'MISSING_REQUIRED' : 'MISSING_REQUIRED',
          def.type === 'positional'
            ? `missing required positional: ${name}`
            : `missing required option: --${name}`,
          { flag: name },
        ),
      )
    }
  }

  const result: ParseResult = {
    values,
    positional,
    rest,
    unknown,
  }

  return errors.length === 0 ? { ok: true, result, errors: [] } : { ok: false, result, errors }
}

// ──────────────────────────────────────────────────────────────────────────────
// Value consumption
// ──────────────────────────────────────────────────────────────────────────────

interface ConsumeResult {
  readonly value: unknown
  readonly nextIndex: number
  readonly error?: ParseError
}

function consumeValue(
  def: ArgDef,
  inline: string | undefined,
  argv: readonly string[],
  index: number,
): ConsumeResult {
  if (def.type === 'boolean') {
    if (inline === undefined) {
      return { value: true, nextIndex: index }
    }
    const c = coerceForType(inline, 'boolean')
    if (!c.ok) {
      return {
        value: undefined,
        nextIndex: index,
        error: makeError('INVALID_VALUE', `--${def.alias ?? ''}: ${c.reason}`, {
          value: inline,
        }),
      }
    }
    return { value: c.value, nextIndex: index }
  }

  if (def.type === 'count') {
    // Sentinel: no inline → caller increments by 1. Inline → set to integer.
    if (inline === undefined) return { value: undefined, nextIndex: index }
    const c = coerceForType(inline, 'integer')
    if (!c.ok) {
      return {
        value: undefined,
        nextIndex: index,
        error: makeError('INVALID_VALUE', `count value: ${c.reason}`, { value: inline }),
      }
    }
    return { value: c.value, nextIndex: index }
  }

  // Non-boolean, non-count: needs a value
  let raw: string | undefined = inline
  let nextIndex = index
  if (raw === undefined) {
    const next = argv[index + 1]
    if (looksLikeValue(next)) {
      raw = next
      nextIndex = index + 1
    }
  }

  if (raw === undefined) {
    return {
      value: undefined,
      nextIndex,
      error: makeError('MISSING_VALUE', 'missing value for option'),
    }
  }

  const c = coerceForType(raw, def.type)
  if (!c.ok) {
    return {
      value: undefined,
      nextIndex,
      error: makeError('INVALID_VALUE', c.reason, { value: raw }),
    }
  }
  return { value: c.value, nextIndex }
}

// ──────────────────────────────────────────────────────────────────────────────
// Positional mapping
// ──────────────────────────────────────────────────────────────────────────────

function mapPositionals(
  positionals: readonly { readonly name: string; readonly def: ArgDef }[],
  collected: readonly string[],
  values: Record<string, unknown>,
  errors: ParseError[],
): void {
  let i = 0
  for (const { name, def } of positionals) {
    if (def.rest) {
      const remaining = collected.slice(i)
      const coerced: unknown[] = []
      for (const raw of remaining) {
        const c = coerceForType(raw, def.type === 'positional' ? 'string' : def.type)
        if (!c.ok) {
          errors.push(makeError('INVALID_VALUE', `${name}: ${c.reason}`, { value: raw }))
          continue
        }
        coerced.push(c.value)
      }
      safeSet(values, name, coerced)
      return
    }
    const raw = collected[i++]
    if (raw === undefined) continue
    const c = coerceForType(raw, def.type === 'positional' ? 'string' : def.type)
    if (!c.ok) {
      errors.push(makeError('INVALID_VALUE', `${name}: ${c.reason}`, { value: raw }))
      continue
    }
    safeSet(values, name, c.value)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Misc
// ──────────────────────────────────────────────────────────────────────────────

function emptyResult(): ParseResult {
  return {
    values: nullObject(),
    positional: [],
    rest: [],
    unknown: [],
  }
}

function processEnvOrEmpty(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>
  }
  return {}
}
