/**
 * `wizard()` — declarative multi-step prompt flow.
 *
 *   const result = await wizard({
 *     io,
 *     steps: [
 *       {
 *         id: 'kind',
 *         prompt: ({ io }) =>
 *           select({ io, message: 'Type?', options: [
 *             { value: 'web', label: 'Web app' },
 *             { value: 'cli', label: 'CLI tool' },
 *           ] }),
 *       },
 *       {
 *         id: 'framework',
 *         when: (s) => s.kind === 'web',
 *         prompt: ({ io }) =>
 *           select({ io, message: 'Framework?', options: [
 *             { value: 'astro', label: 'Astro' },
 *             { value: 'next', label: 'Next.js' },
 *           ] }),
 *       },
 *       {
 *         id: 'name',
 *         prompt: ({ io }) => text({ io, message: 'Name?' }),
 *       },
 *     ],
 *   })
 *
 * Step semantics:
 *
 *   - `when(state)` returning `false` skips the step (no value recorded).
 *   - `next(state)` returning a step id jumps to it; otherwise the engine
 *     advances linearly.
 *   - `back: true` lets the user press Escape to go to the previous step
 *     (or `back('id')` to jump to a specific one). Default is no back.
 *   - The wizard pre-renders an `intro` header if provided; the active step
 *     index is shown as `[N/M]` next to it.
 *
 * `PromptCancelledError` from any step bubbles up. The wizard never catches
 * other errors — they bubble to the caller, preserving stack traces.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import { intro } from './chrome'
import { PromptCancelledError, type WizardOptions, type WizardStep } from './types'

export async function wizard<S extends Record<string, unknown> = Record<string, unknown>>(
  opts: WizardOptions<S>,
): Promise<S> {
  const { io, steps, signal } = opts
  if (steps.length === 0) throw new Error('wizard: at least one step is required')

  const total = steps.length
  const state: Record<string, unknown> = Object.create(null)
  const stack: number[] = []
  let i = 0

  if (opts.intro) intro(io, opts.intro)

  while (i < steps.length) {
    const step = steps[i]
    if (!step) break

    if (step.when && !step.when(state as S)) {
      i = nextIndex(steps, i, step, state)
      continue
    }

    const counter = colors.gray(`[${stack.length + 1}/${total}]`)
    io.write(`${counter} `)

    try {
      const value = await step.prompt({ io, state: state as S, ...(signal !== undefined && { signal }) })
      state[step.id] = value
      stack.push(i)
    } catch (err) {
      if (err instanceof PromptCancelledError) {
        if (step.back && stack.length > 0) {
          // Treat cancel as "go back one step" if the step opts in.
          const prev = stack.pop()
          if (prev !== undefined) {
            i = prev
            continue
          }
        }
        throw err
      }
      throw err
    }

    i = nextIndex(steps, i, step, state)
  }

  if (opts.onComplete) {
    await opts.onComplete(state as S)
  }
  return state as S
}

function nextIndex<S extends Record<string, unknown>>(
  steps: readonly WizardStep<S>[],
  current: number,
  step: WizardStep<S>,
  state: Record<string, unknown>,
): number {
  if (step.next) {
    const target = step.next(state as S)
    if (target === false) return steps.length // end wizard
    if (typeof target === 'string') {
      const idx = steps.findIndex((s) => s.id === target)
      if (idx === -1) {
        throw new Error(`wizard: step.next() returned unknown step id '${target}'`)
      }
      return idx
    }
  }
  return current + 1
}
