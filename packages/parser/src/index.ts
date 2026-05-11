/**
 * `@simtabi/cli-kit-js-parser`
 *
 * argv → typed parsed args. Fixes the bugs documented in
 * https://github.com/simtabi/cli-kit-js/blob/main/packages/parser/README.md
 *
 * Default export: `parse(argv, options)` returning a `ParseOutcome` discriminated
 * union. No throws on user input; programmer errors (invalid arg definitions)
 * are reported in the outcome as `BAD_DEFINITION`.
 */

export { parse } from './parse'
export {
  isAllowedKey,
  nullObject,
  safeSet,
} from './keys'
export {
  coerceBoolean,
  coerceForType,
  coerceInteger,
  coerceNumber,
  isEnumValid,
  type CoerceResult,
} from './coerce'
export {
  DEFAULT_CAPS,
  type ArgDef,
  type ArgType,
  type ParseError,
  type ParseErrorCode,
  type ParseOptions,
  type ParseOutcome,
  type ParseResult,
} from './types'
