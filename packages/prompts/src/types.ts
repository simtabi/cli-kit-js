/**
 * Public types for `@simtabi/cli-kit-js-prompts`.
 */

import type { IOAdapter } from '@simtabi/cli-kit-js-io'

export interface PromptBase {
  readonly io: IOAdapter
  readonly message: string
  readonly signal?: AbortSignal
}

export type ValidateResult = true | string

export interface TextPromptOptions extends PromptBase {
  readonly default?: string
  readonly placeholder?: string
  readonly validate?: (value: string) => ValidateResult
}

export interface PasswordPromptOptions extends PromptBase {
  readonly mask?: string
  readonly validate?: (value: string) => ValidateResult
}

export interface ConfirmPromptOptions extends PromptBase {
  readonly default?: boolean
}

export interface SelectOption<T = string> {
  readonly value: T
  readonly label: string
  readonly description?: string
  readonly disabled?: boolean
}

export interface SelectPromptOptions<T = string> extends PromptBase {
  readonly options: readonly SelectOption<T>[]
  readonly initial?: number
}

export interface MultiselectPromptOptions<T = string> extends PromptBase {
  readonly options: readonly SelectOption<T>[]
  readonly initialSelected?: readonly T[]
  readonly minSelected?: number
  readonly maxSelected?: number
}

export interface NumberPromptOptions extends PromptBase {
  readonly default?: number
  readonly min?: number
  readonly max?: number
  /** Amount added by Up/Down arrows. Default 1. */
  readonly step?: number
  /** Reject non-integer input. */
  readonly integer?: boolean
  readonly validate?: (value: number) => ValidateResult
}

/**
 * Source for the autocomplete prompt — either a static array (filtered
 * client-side, case-insensitive substring) or a `(query) => Promise<options>`
 * function for remote searches.
 */
export type AutocompleteSource<T = string> =
  | readonly SelectOption<T>[]
  | ((query: string) => Promise<readonly SelectOption<T>[]>)

export interface AutocompletePromptOptions<T = string> extends PromptBase {
  readonly source: AutocompleteSource<T>
  /** Cap the number of matches shown. Default 8. */
  readonly maxResults?: number
}

export interface EditListPromptOptions extends PromptBase {
  readonly initial?: readonly string[]
  readonly min?: number
  readonly max?: number
  /** Separator used by the non-TTY fallback. Default ','. */
  readonly separator?: string
  readonly validate?: (item: string) => ValidateResult
}

// ──────────────────────────────────────────────────────────────────────────────
// Form
// ──────────────────────────────────────────────────────────────────────────────

interface FieldBase {
  readonly name: string
  readonly message: string
}

export type FormField =
  | (FieldBase & {
      readonly kind: 'text'
      readonly default?: string
      readonly placeholder?: string
      readonly validate?: (value: string) => ValidateResult
    })
  | (FieldBase & {
      readonly kind: 'password'
      readonly mask?: string
      readonly validate?: (value: string) => ValidateResult
    })
  | (FieldBase & {
      readonly kind: 'confirm'
      readonly default?: boolean
    })
  | (FieldBase & {
      readonly kind: 'number'
      readonly default?: number
      readonly min?: number
      readonly max?: number
      readonly step?: number
      readonly integer?: boolean
      readonly validate?: (value: number) => ValidateResult
    })
  | (FieldBase & {
      readonly kind: 'select'
      readonly options: readonly SelectOption<string>[]
      readonly initial?: number
    })
  | (FieldBase & {
      readonly kind: 'multiselect'
      readonly options: readonly SelectOption<string>[]
      readonly initialSelected?: readonly string[]
      readonly minSelected?: number
      readonly maxSelected?: number
    })
  | (FieldBase & {
      readonly kind: 'autocomplete'
      readonly source: AutocompleteSource<string>
      readonly maxResults?: number
    })
  | (FieldBase & {
      readonly kind: 'editList'
      readonly initial?: readonly string[]
      readonly min?: number
      readonly max?: number
      readonly separator?: string
      readonly validate?: (item: string) => ValidateResult
    })

export interface FormOptions {
  readonly io: IOAdapter
  /** Optional header rendered before the first field. */
  readonly message?: string
  readonly fields: readonly FormField[]
  readonly signal?: AbortSignal
  /** Cross-field validation called after every field has been collected. */
  readonly validate?: (result: Readonly<Record<string, unknown>>) => ValidateResult
}

// ──────────────────────────────────────────────────────────────────────────────
// Wizard
// ──────────────────────────────────────────────────────────────────────────────

export interface WizardContext<S extends Record<string, unknown>> {
  readonly io: IOAdapter
  readonly state: Readonly<S>
  readonly signal?: AbortSignal
}

export interface WizardStep<S extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string
  /** Skip the step if this predicate returns false. */
  readonly when?: (state: Readonly<S>) => boolean
  /**
   * Compute the next step id given the current state. Return `false` to end
   * the wizard. Return a step id to jump. Return `undefined` (or omit) for
   * linear advance.
   */
  readonly next?: (state: Readonly<S>) => string | false | undefined
  /** Allow Esc to navigate back from this step. Default false. */
  readonly back?: boolean
  readonly prompt: (ctx: WizardContext<S>) => Promise<unknown>
}

export interface WizardOptions<S extends Record<string, unknown> = Record<string, unknown>> {
  readonly io: IOAdapter
  readonly steps: readonly WizardStep<S>[]
  /** Optional header rendered before the first step. */
  readonly intro?: string
  readonly signal?: AbortSignal
  readonly onComplete?: (state: Readonly<S>) => void | Promise<void>
}

export class PromptCancelledError extends Error {
  override readonly name = 'PromptCancelledError'
  constructor(message = 'prompt cancelled') {
    super(message)
  }
}
