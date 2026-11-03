/**
 * `@simtabi/cli-kit-js-config`
 *
 * Layered, schema-validated configuration with prototype-pollution-safe parsing,
 * path-sandboxed file loading, and sensitive-value redaction.
 */

export { createConfig, createConfigFromLayers } from './config'
export { JsonSizeError, PollutionError, safeParse } from './json'
export { type LayerData, loadLayers } from './loader'
export { cloneNull, deepFreeze, redactSensitive } from './redact'
export { defineSchema, findFieldDef, getDefaults, walkSchema } from './schema'

export type {
  AuditEntry,
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
