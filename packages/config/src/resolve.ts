/**
 * Layer resolution. Walks the schema in order and decides the effective value
 * + provenance for each declared field.
 */

import type { LayerData } from './loader'
import {
  findFieldDef,
  getPath,
  setPath,
  validateField,
  walkSchema,
} from './schema'
import type {
  ConfigValidationError,
  CreateConfigOptions,
  FieldDef,
  Schema,
  SchemaLayer,
  SourceInfo,
} from './types'

export interface ResolvedConfig {
  /** Effective merged value tree (null-prototype). */
  readonly values: Record<string, unknown>
  /** Provenance: dot-path → which layer it came from + raw layer value. */
  readonly sources: Map<string, SourceInfo>
  /** Validation errors collected. */
  readonly errors: readonly ConfigValidationError[]
  /** File-loaded values per layer (immutable, used by reset()). */
  readonly fileValues: Record<string, unknown>
}

export interface ResolveInputs {
  readonly schema: Schema
  readonly layers: readonly LayerData[]
  readonly env: Readonly<Record<string, string | undefined>>
  readonly envPrefix?: string
  readonly cli?: Readonly<Record<string, unknown>>
  readonly runtime?: Readonly<Record<string, unknown>>
  readonly strict: boolean
}

export function resolve(
  inputs: ResolveInputs,
  _opts?: CreateConfigOptions,
): ResolvedConfig {
  const { schema, layers, env, cli, runtime, envPrefix } = inputs
  const values: Record<string, unknown> = Object.create(null)
  const sources = new Map<string, SourceInfo>()
  const fileValues: Record<string, unknown> = Object.create(null)
  const errors: ConfigValidationError[] = []

  // Collect file-layer errors first
  for (const l of layers) {
    for (const e of l.errors) errors.push(e)
  }

  walkSchema(schema, (path, def) => {
    // 1) Defaults
    if (def.default !== undefined) {
      setPath(values, path, def.default)
      sources.set(path, { layer: 'defaults', value: def.default })
    }

    // 2-5) File layers in order
    for (const layer of layers) {
      if (!layer.data) continue
      const v = getPath(layer.data as Record<string, unknown>, path)
      if (v === undefined) continue
      const result = validateField(def, v)
      if (!result.ok) {
        errors.push({
          code: 'INVALID_VALUE',
          path,
          message: `${layer.layer}: ${result.reason}`,
          layer: layer.layer,
        })
        continue
      }
      setPath(values, path, result.value)
      setPath(fileValues, path, result.value)
      sources.set(path, { layer: layer.layer, value: result.value })
    }

    // 6) Env-var binding
    const envBindings = def.env ? (Array.isArray(def.env) ? def.env : [def.env]) : []
    if (envPrefix) {
      // Auto-bind from prefix + UPPER_SNAKE_CASE(path)
      envBindings.push(`${envPrefix}${path.toUpperCase().replace(/\./g, '_')}`)
    }
    for (const name of envBindings) {
      const v = env[name]
      if (v === undefined) continue
      const result = validateField(def, v)
      if (!result.ok) {
        errors.push({
          code: 'INVALID_VALUE',
          path,
          message: `env ${name}: ${result.reason}`,
          layer: 'env',
        })
        continue
      }
      setPath(values, path, result.value)
      sources.set(path, { layer: 'env', value: result.value })
      break
    }

    // 7) CLI binding
    if (cli) {
      const cliKey = def.cli ?? path
      const cliVal = readCliValue(cli, cliKey, path)
      if (cliVal !== undefined) {
        const result = validateField(def, cliVal)
        if (!result.ok) {
          errors.push({
            code: 'INVALID_VALUE',
            path,
            message: `cli ${cliKey}: ${result.reason}`,
            layer: 'cli',
          })
        } else {
          setPath(values, path, result.value)
          sources.set(path, { layer: 'cli', value: result.value })
        }
      }
    }

    // 8) Runtime
    if (runtime) {
      const v = getPath(runtime as Record<string, unknown>, path)
      if (v !== undefined) {
        const result = validateField(def, v)
        if (!result.ok) {
          errors.push({
            code: 'INVALID_VALUE',
            path,
            message: `runtime: ${result.reason}`,
            layer: 'runtime',
          })
        } else {
          setPath(values, path, result.value)
          sources.set(path, { layer: 'runtime', value: result.value })
        }
      }
    }

    // 9) Required
    const final = getPath(values, path)
    if (def.required && (final === undefined || final === null)) {
      errors.push({
        code: 'MISSING_REQUIRED',
        path,
        message: `missing required field`,
      })
    }
  })

  // Strict mode: reject unknown keys present in file/runtime layers
  if (inputs.strict) {
    const layerTrees: Array<{ layer: SchemaLayer; tree: Record<string, unknown> }> = []
    for (const l of layers) {
      if (l.data) layerTrees.push({ layer: l.layer, tree: l.data as Record<string, unknown> })
    }
    if (runtime) layerTrees.push({ layer: 'runtime', tree: runtime as Record<string, unknown> })
    for (const { layer, tree } of layerTrees) {
      for (const path of enumerateLeafPaths(tree)) {
        if (!findFieldDef(schema, path)) {
          errors.push({
            code: 'UNKNOWN_KEY',
            path,
            message: `unknown key in ${layer}`,
            layer,
          })
        }
      }
    }
  }

  return { values, sources, errors, fileValues }
}

function readCliValue(
  cli: Readonly<Record<string, unknown>>,
  cliKey: string,
  fallbackPath: string,
): unknown {
  // Try CLI key first (e.g. "--port" or "server.port"), then dot-path
  if (cliKey in cli) return (cli as Record<string, unknown>)[cliKey]
  // Strip leading dashes
  const stripped = cliKey.replace(/^-{1,2}/, '')
  if (stripped in cli) return (cli as Record<string, unknown>)[stripped]
  if (fallbackPath in cli) return (cli as Record<string, unknown>)[fallbackPath]
  return getPath(cli as Record<string, unknown>, fallbackPath)
}

function* enumerateLeafPaths(
  tree: Record<string, unknown>,
  prefix = '',
): Generator<string> {
  for (const [key, value] of Object.entries(tree)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      yield* enumerateLeafPaths(value as Record<string, unknown>, next)
    } else {
      yield next
    }
  }
}

/**
 * Public for tests: validate a single (def, value) pair using the same logic.
 */
export function validateOne(
  def: FieldDef,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  return validateField(def, value)
}
