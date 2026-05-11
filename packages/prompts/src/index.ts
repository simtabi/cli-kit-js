/**
 * `@simtabi/cli-kit-js-prompts`
 *
 * Interactive prompts built on `@simtabi/cli-kit-js-io`'s raw-mode primitive.
 * Every prompt:
 *   - takes an `IOAdapter` + an optional `AbortSignal`.
 *   - falls back to `io.readLine` when `io.isTTY === false`.
 *   - throws `PromptCancelledError` on Ctrl+C / Escape / abort.
 */

export { confirm } from './confirm'
export { multiselect } from './multiselect'
export { password } from './password'
export { select } from './select'
export { text } from './text'

// SecureString is exported for consumers writing custom credential prompts.
export { SecureString } from './secure-string'

export {
  PromptCancelledError,
  type ConfirmPromptOptions,
  type MultiselectPromptOptions,
  type PasswordPromptOptions,
  type PromptBase,
  type SelectOption,
  type SelectPromptOptions,
  type TextPromptOptions,
  type ValidateResult,
} from './types'
