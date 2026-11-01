/**
 * `form()` — run a sequence of typed prompts under a shared header. Each
 * field is rendered with the right prompt for its `kind` and the result is
 * keyed by `name`:
 *
 *   const result = await form({
 *     io,
 *     message: 'Project setup',
 *     fields: [
 *       { name: 'project', kind: 'text', message: 'Project name?' },
 *       { name: 'port', kind: 'number', message: 'Port?', default: 3000 },
 *       { name: 'features', kind: 'multiselect', message: 'Features?',
 *         options: [{ value: 'a', label: 'A' }] },
 *     ],
 *   })
 *   // result: { project: string, port: number, features: string[] }
 *
 * Unlike a wizard, all fields run; there is no branching or skip.
 *
 * Returns an object keyed by field `name`. Values are typed loosely as
 * `Record<string, unknown>` — strongly-typed access requires casting the
 * return value to the consumer's own shape. (Stricter generics will arrive
 * once TypeScript variadic tuple inference stabilises for this pattern.)
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import { autocomplete } from './autocomplete'
import { confirm } from './confirm'
import { editList } from './edit-list'
import { multiselect } from './multiselect'
import { number } from './number'
import { password } from './password'
import { select } from './select'
import { text } from './text'
import { type FormField, type FormOptions, PromptCancelledError } from './types'

export async function form(opts: FormOptions): Promise<Readonly<Record<string, unknown>>> {
  const { io, message, fields, signal } = opts
  if (fields.length === 0) throw new Error('form: at least one field is required')

  if (message) {
    io.write(`${colors.bold(message)}\n\n`)
  }

  const result: Record<string, unknown> = Object.create(null)
  try {
    for (const field of fields) {
      const value = await runField(io, field, signal)
      result[field.name] = value
    }
  } catch (err) {
    if (err instanceof PromptCancelledError) throw err
    throw err
  }

  if (opts.validate) {
    const r = opts.validate(result)
    if (r !== true) throw new Error(r)
  }
  return result
}

async function runField(
  io: FormOptions['io'],
  field: FormField,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  switch (field.kind) {
    case 'text':
      return text({
        io,
        message: field.message,
        ...(signal !== undefined && { signal }),
        ...(field.default !== undefined && { default: field.default }),
        ...(field.placeholder !== undefined && { placeholder: field.placeholder }),
        ...(field.validate !== undefined && { validate: field.validate }),
      })
    case 'password':
      return password({
        io,
        message: field.message,
        ...(signal !== undefined && { signal }),
        ...(field.mask !== undefined && { mask: field.mask }),
        ...(field.validate !== undefined && { validate: field.validate }),
      })
    case 'confirm':
      return confirm({
        io,
        message: field.message,
        ...(signal !== undefined && { signal }),
        ...(field.default !== undefined && { default: field.default }),
      })
    case 'number':
      return number({
        io,
        message: field.message,
        ...(signal !== undefined && { signal }),
        ...(field.default !== undefined && { default: field.default }),
        ...(field.min !== undefined && { min: field.min }),
        ...(field.max !== undefined && { max: field.max }),
        ...(field.step !== undefined && { step: field.step }),
        ...(field.integer !== undefined && { integer: field.integer }),
        ...(field.validate !== undefined && { validate: field.validate }),
      })
    case 'select':
      return select({
        io,
        message: field.message,
        options: field.options,
        ...(signal !== undefined && { signal }),
        ...(field.initial !== undefined && { initial: field.initial }),
      })
    case 'multiselect':
      return multiselect({
        io,
        message: field.message,
        options: field.options,
        ...(signal !== undefined && { signal }),
        ...(field.initialSelected !== undefined && { initialSelected: field.initialSelected }),
        ...(field.minSelected !== undefined && { minSelected: field.minSelected }),
        ...(field.maxSelected !== undefined && { maxSelected: field.maxSelected }),
      })
    case 'autocomplete':
      return autocomplete({
        io,
        message: field.message,
        source: field.source,
        ...(signal !== undefined && { signal }),
        ...(field.maxResults !== undefined && { maxResults: field.maxResults }),
      })
    case 'editList':
      return editList({
        io,
        message: field.message,
        ...(signal !== undefined && { signal }),
        ...(field.initial !== undefined && { initial: field.initial }),
        ...(field.min !== undefined && { min: field.min }),
        ...(field.max !== undefined && { max: field.max }),
        ...(field.separator !== undefined && { separator: field.separator }),
        ...(field.validate !== undefined && { validate: field.validate }),
      })
    default: {
      const unknown = field as { readonly kind: string }
      throw new Error(`form: unknown field kind '${unknown.kind}'`)
    }
  }
}
