/**
 * Hook bus. Plugins register handlers; the bus fires them in declaration order.
 *
 *   - `strict: false` (default): a plugin throw is caught and logged at warn
 *     via the IOAdapter's `writeError`; the run continues.
 *   - `strict: true`: a plugin throw propagates and aborts the current run.
 */

import type { IOAdapter } from '@simtabi/cli-kit-js-io'
import type { HookEvent, HookHandler, HookPayloads, Plugin } from './types'

export class HookBus {
  readonly #handlers = new Map<HookEvent, Array<{ name: string; fn: HookHandler<HookEvent> }>>()
  readonly #strict: boolean
  readonly #io: IOAdapter | undefined

  constructor(opts: { readonly strict?: boolean; readonly io?: IOAdapter } = {}) {
    this.#strict = opts.strict === true
    this.#io = opts.io
  }

  register(plugins: readonly Plugin[]): void {
    for (const p of plugins) {
      for (const event of Object.keys(p.hooks) as HookEvent[]) {
        const fn = p.hooks[event]
        if (!fn) continue
        const list = this.#handlers.get(event) ?? []
        list.push({ name: p.name, fn: fn as HookHandler<HookEvent> })
        this.#handlers.set(event, list)
      }
    }
  }

  async emit<E extends HookEvent>(event: E, payload: HookPayloads[E]): Promise<void> {
    const list = this.#handlers.get(event)
    if (!list) return
    for (const { name, fn } of list) {
      try {
        await (fn as HookHandler<E>)(payload)
      } catch (err: unknown) {
        if (this.#strict) throw err
        const message = err instanceof Error ? err.message : String(err)
        this.#io?.writeError(`[hook ${name}:${event}] ${message}\n`)
      }
    }
  }
}
