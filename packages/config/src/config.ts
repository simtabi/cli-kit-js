/**
 * The Config instance. `createConfig()` returns it.
 *
 * Lifecycle:
 *   1. `loadLayers()` reads JSON files from disk.
 *   2. `resolve()` merges layers + env + cli into the effective value tree.
 *   3. The instance exposes `get` / `set` / `assign` / `reset` / `on` /
 *      `snapshot` / `source`.
 *   4. `set` writes to the runtime layer, validates against the schema, and
 *      fires `change` events synchronously.
 */

import { type LayerData, loadLayers } from './loader'
import { cloneNull, deepFreeze, redactSensitive } from './redact'
import { type ResolvedConfig, resolve } from './resolve'
import { findFieldDef, getPath, setPath, validateField } from './schema'
import type {
  ChangeHandler,
  ConfigInstance,
  ConfigValidationError,
  CreateConfigOptions,
  SourceInfo,
} from './types'

const NODE_ENV_DEFAULT = 'development'

class Config implements ConfigInstance {
  readonly #opts: Required<
    Pick<CreateConfigOptions, 'schema' | 'configDir' | 'environment' | 'strict' | 'envPrefix'>
  > &
    CreateConfigOptions
  readonly #env: Readonly<Record<string, string | undefined>>
  readonly #cli: Readonly<Record<string, unknown>>
  #layers: readonly LayerData[]
  #runtime: Record<string, unknown> = Object.create(null)
  #resolved: ResolvedConfig
  readonly #changeHandlers = new Set<ChangeHandler>()
  readonly #pathHandlers = new Map<string, Set<(prev: unknown, next: unknown) => void>>()
  #frozen = false

  constructor(
    opts: CreateConfigOptions,
    env: Readonly<Record<string, string | undefined>>,
    layers: readonly LayerData[],
  ) {
    this.#opts = {
      ...opts,
      configDir: opts.configDir ?? './config',
      environment: opts.environment ?? env.NODE_ENV ?? NODE_ENV_DEFAULT,
      strict: opts.strict !== false,
      envPrefix: opts.envPrefix ?? '',
    }
    this.#env = env
    this.#cli = opts.cli ?? {}
    this.#layers = layers
    this.#resolved = this.#resolve()
    if (opts.freezeAfterLoad) this.#frozen = true
  }

  #resolve(): ResolvedConfig {
    return resolve({
      schema: this.#opts.schema,
      layers: this.#layers,
      env: this.#env,
      envPrefix: this.#opts.envPrefix,
      cli: this.#cli,
      runtime: this.#runtime,
      strict: this.#opts.strict,
    })
  }

  get validationErrors(): readonly ConfigValidationError[] {
    return this.#resolved.errors
  }

  get<T = unknown>(path: string, defaultValue?: T): T {
    const v = getPath(this.#resolved.values, path)
    return (v === undefined ? defaultValue : v) as T
  }

  set(
    path: string,
    value: unknown,
  ): { readonly ok: true } | { readonly ok: false; readonly error: ConfigValidationError } {
    if (this.#frozen) {
      return {
        ok: false,
        error: {
          code: 'INVALID_VALUE',
          path,
          message: 'config is frozen (freezeAfterLoad)',
          layer: 'runtime',
        },
      }
    }
    const def = findFieldDef(this.#opts.schema, path)
    if (!def) {
      if (this.#opts.strict) {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN_KEY',
            path,
            message: 'unknown key in schema',
            layer: 'runtime',
          },
        }
      }
      // Non-strict: allow but no validation
      const prev = this.get(path)
      setPath(this.#runtime, path, value)
      this.#resolved = this.#resolve()
      this.#fire(path, prev, value)
      return { ok: true }
    }
    const result = validateField(def, value)
    if (!result.ok) {
      return {
        ok: false,
        error: {
          code: 'INVALID_VALUE',
          path,
          message: result.reason,
          layer: 'runtime',
        },
      }
    }
    const prev = this.get(path)
    setPath(this.#runtime, path, result.value)
    this.#resolved = this.#resolve()
    this.#fire(path, prev, result.value)
    return { ok: true }
  }

  assign(patch: Readonly<Record<string, unknown>>): readonly ConfigValidationError[] {
    const errors: ConfigValidationError[] = []
    for (const leafPath of enumerateLeafPaths(patch as Record<string, unknown>)) {
      const value = getPath(patch as Record<string, unknown>, leafPath)
      const r = this.set(leafPath, value)
      if (!r.ok) errors.push(r.error)
    }
    return errors
  }

  reset(path: string): void {
    if (this.#frozen) return
    // Delete from runtime layer
    deletePath(this.#runtime, path)
    const prev = this.get(path)
    this.#resolved = this.#resolve()
    const next = this.get(path)
    if (!Object.is(prev, next)) this.#fire(path, prev, next)
  }

  resetAll(): void {
    if (this.#frozen) return
    this.#runtime = Object.create(null)
    this.#resolved = this.#resolve()
  }

  snapshot(opts?: { readonly redactSensitive?: boolean }): Readonly<Record<string, unknown>> {
    const cloned = cloneNull(this.#resolved.values) as Record<string, unknown>
    const final = opts?.redactSensitive ? redactSensitive(cloned, this.#opts.schema) : cloned
    return deepFreeze(final)
  }

  source(path: string): SourceInfo {
    return this.#resolved.sources.get(path) ?? { layer: 'defaults', value: undefined }
  }

  on(event: 'change', handler: ChangeHandler): () => void {
    if (event !== 'change') return () => undefined
    this.#changeHandlers.add(handler)
    return () => {
      this.#changeHandlers.delete(handler)
    }
  }

  onPath(path: string, handler: (prev: unknown, next: unknown) => void): () => void {
    let set = this.#pathHandlers.get(path)
    if (!set) {
      set = new Set()
      this.#pathHandlers.set(path, set)
    }
    set.add(handler)
    return () => {
      set?.delete(handler)
    }
  }

  #fire(path: string, prev: unknown, next: unknown): void {
    for (const h of this.#changeHandlers) {
      try {
        h(path, prev, next)
      } catch {
        // Plugin failures must not abort host commands. Silenced here; the
        // runner package (core) is responsible for logging hook errors.
      }
    }
    const set = this.#pathHandlers.get(path)
    if (set) {
      for (const h of set) {
        try {
          h(prev, next)
        } catch {
          // ditto
        }
      }
    }
  }
}

function* enumerateLeafPaths(tree: Record<string, unknown>, prefix = ''): Generator<string> {
  for (const [key, value] of Object.entries(tree)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      yield* enumerateLeafPaths(value as Record<string, unknown>, next)
    } else {
      yield next
    }
  }
}

function deletePath(obj: Record<string, unknown>, dotPath: string): void {
  const parts = dotPath.split('.')
  let cursor: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (part === undefined) return
    const next = cursor[part]
    if (next === undefined || next === null || typeof next !== 'object') return
    cursor = next as Record<string, unknown>
  }
  const last = parts[parts.length - 1]
  if (last !== undefined) delete cursor[last]
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────────────────────

function readProcessEnv(): Readonly<Record<string, string | undefined>> {
  if (typeof process !== 'undefined' && process.env != null) {
    return process.env as Record<string, string | undefined>
  }
  return {}
}

/**
 * Build a Config instance. Reads JSON files from `configDir` (default `./config`),
 * resolves layers, validates against the schema, exposes the typed API.
 *
 * Throws on programmer error (no schema). Validation errors during load are
 * collected in `config.validationErrors` and the instance is still returned.
 */
export async function createConfig(opts: CreateConfigOptions): Promise<ConfigInstance> {
  if (!opts.schema) throw new Error('createConfig: schema is required')
  const env = opts.env ?? readProcessEnv()
  const environment = opts.environment ?? env.NODE_ENV ?? NODE_ENV_DEFAULT
  const configDir = opts.configDir ?? './config'

  const layers = await loadLayers({
    configDir,
    environment,
    ...(opts.maxFileBytes !== undefined && { maxFileBytes: opts.maxFileBytes }),
    ...(opts.maxTotalBytes !== undefined && { maxTotalBytes: opts.maxTotalBytes }),
  })
  return new Config(opts, env, layers)
}

/**
 * Synchronous variant for callers that already have layer data (e.g. browser
 * code that fetched layers separately, or tests).
 */
export function createConfigFromLayers(
  opts: CreateConfigOptions,
  layers: readonly LayerData[],
): ConfigInstance {
  if (!opts.schema) throw new Error('createConfigFromLayers: schema is required')
  const env = opts.env ?? readProcessEnv()
  return new Config(opts, env, layers)
}
