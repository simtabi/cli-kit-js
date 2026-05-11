/**
 * `@simtabi/cli-kit-js-config`
 *
 * Layered, schema-validated configuration with prototype-pollution-safe parsing,
 * path-sandboxed file loading, and sensitive-value redaction.
 */

export { createConfig, createConfigFromLayers } from './config'
export { defineSchema, findFieldDef, getDefaults, walkSchema } from './schema'
export { safeParse, JsonSizeError, PollutionError } from './json'
export { redactSensitive, deepFreeze, cloneNull } from './redact'
export { loadLayers, type LayerData } from './loader'

export type {
  ChangeHandler,
  ConfigInstance,
  ConfigValidationError,
  CreateConfigOptions,
  FieldDef,
  FieldType,
  Schema,
  SchemaLayer,
  SourceInfo,
} from './types'

export {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_TOTAL_BYTES,
} from './types'
