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

export class PromptCancelledError extends Error {
  override readonly name = 'PromptCancelledError'
  constructor(message = 'prompt cancelled') {
    super(message)
  }
}
