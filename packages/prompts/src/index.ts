/**
 * `@simtabi/cli-kit-js-prompts`
 *
 * Interactive prompts built on `@simtabi/cli-kit-js-io`'s raw-mode primitive.
 * Every prompt:
 *   - takes an `IOAdapter` + an optional `AbortSignal`.
 *   - falls back to `io.readLine` when `io.isTTY === false`.
 *   - throws `PromptCancelledError` on Ctrl+C / Escape / abort.
 *   - works in browser DOM via `IOAdapter.beginRegion()` when
 *     `capabilities.cursorMoves === false`.
 */

export { autocomplete } from './autocomplete'
export { confirm } from './confirm'
export { editList } from './edit-list'
export { form } from './form'
export { multiselect } from './multiselect'
export { number } from './number'
export { password } from './password'
export { select } from './select'
export { text } from './text'
export { wizard } from './wizard'

// Display-only chrome helpers (use inside wizards / forms).
export { intro, note, outro, rail } from './chrome'

// Renderer primitive — power users who want to compose custom prompts.
export { createPromptRenderer, countNewlines, type PromptRenderer } from './renderer'

// SecureString is exported for consumers writing custom credential prompts.
export { SecureString } from './secure-string'

export {
  PromptCancelledError,
  type AutocompletePromptOptions,
  type AutocompleteSource,
  type ConfirmPromptOptions,
  type EditListPromptOptions,
  type FormField,
  type FormOptions,
  type MultiselectPromptOptions,
  type NumberPromptOptions,
  type PasswordPromptOptions,
  type PromptBase,
  type SelectOption,
  type SelectPromptOptions,
  type TextPromptOptions,
  type ValidateResult,
  type WizardContext,
  type WizardOptions,
  type WizardStep,
} from './types'
