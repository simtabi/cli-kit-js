/**
 * Command definition.
 *
 * Two surfaces produce the *same* immutable `Command` config:
 *
 *   1. `defineCommand({ meta, args, run })` — declarative object, citty-style.
 *   2. `cli('name').option('foo', …).action(…).build()` — fluent OOP builder.
 *
 * Use whichever fits the calling code. Tests in `core` exercise both.
 *
 * Validation at definition time:
 *   - Parent commands with `subCommands` may NOT also declare positionals.
 *     (Statically enforced via TS would require conditional types; here we
 *     run a cheap structural check and throw a descriptive error.)
 *   - Rest positional must be the last positional.
 *   - Reserved arg names (`help`, `version`) collide with built-in flags
 *     unless the consumer explicitly opts out by declaring them themselves.
 */

import type { ArgDef } from '@simtabi/cli-kit-js-parser'
import type {
  ArgsRecord,
  Command,
  CommandMeta,
  Plugin,
  RunContext,
  SubCommands,
} from './types'

export function defineCommand<A extends ArgsRecord>(config: Command<A>): Command<A> {
  assertValid(config)
  return deepFreezeCommand(config)
}

function assertValid<A extends ArgsRecord>(c: Command<A>): void {
  if (!c.meta?.name) {
    throw new Error('defineCommand: meta.name is required')
  }
  const args = c.args ?? ({} as A)
  const hasSubs = !!c.subCommands && Object.keys(c.subCommands).length > 0
  const positionals: string[] = []
  let restSeen = false
  for (const [name, def] of Object.entries(args)) {
    if (def.type === 'positional') {
      if (hasSubs) {
        throw new Error(
          `defineCommand("${c.meta.name}"): positional "${name}" cannot coexist with subCommands`,
        )
      }
      if (restSeen) {
        throw new Error(
          `defineCommand("${c.meta.name}"): positional "${name}" declared after a rest positional`,
        )
      }
      if (def.rest) restSeen = true
      positionals.push(name)
    }
  }
}

function deepFreezeCommand<A extends ArgsRecord>(c: Command<A>): Command<A> {
  // Freeze args
  if (c.args) {
    for (const def of Object.values(c.args)) {
      Object.freeze(def)
    }
    Object.freeze(c.args)
  }
  if (c.subCommands) Object.freeze(c.subCommands)
  if (c.meta) Object.freeze(c.meta)
  if (c.plugins) Object.freeze(c.plugins)
  return Object.freeze(c) as Command<A>
}

// ──────────────────────────────────────────────────────────────────────────────
// Fluent OOP builder
// ──────────────────────────────────────────────────────────────────────────────

export interface CommandBuilder<A extends ArgsRecord = Record<never, ArgDef>> {
  version(v: string): CommandBuilder<A>
  description(d: string): CommandBuilder<A>
  example(e: string): CommandBuilder<A>
  option<K extends string, D extends Omit<ArgDef, 'type'>>(
    name: K,
    type: ArgDef['type'],
    def?: D,
  ): CommandBuilder<A & Record<K, ArgDef>>
  flag<K extends string>(
    name: K,
    def?: Omit<ArgDef, 'type'>,
  ): CommandBuilder<A & Record<K, ArgDef>>
  positional<K extends string>(
    name: K,
    def?: Omit<ArgDef, 'type'>,
  ): CommandBuilder<A & Record<K, ArgDef>>
  subCommand(name: string, child: Command): CommandBuilder<A>
  strict(b: boolean): CommandBuilder<A>
  use(plugin: Plugin): CommandBuilder<A>
  setup(fn: (ctx: RunContext<A>) => Promise<void> | void): CommandBuilder<A>
  action(fn: (ctx: RunContext<A>) => Promise<unknown> | unknown): CommandBuilder<A>
  cleanup(
    fn: (ctx: RunContext<A> & { readonly error?: unknown; readonly result?: unknown }) => Promise<void> | void,
  ): CommandBuilder<A>
  build(): Command<A>
}

class Builder<A extends ArgsRecord> implements CommandBuilder<A> {
  #meta: CommandMeta
  #args: Record<string, ArgDef> = {}
  #subCommands: Record<string, Command> = {}
  #strict?: boolean
  #plugins: Plugin[] = []
  #setup?: (ctx: RunContext<A>) => Promise<void> | void
  #action?: (ctx: RunContext<A>) => Promise<unknown> | unknown
  #cleanup?: (ctx: RunContext<A> & { error?: unknown; result?: unknown }) => Promise<void> | void
  #examples: string[] = []

  constructor(name: string) {
    this.#meta = { name }
  }

  version(v: string): CommandBuilder<A> {
    this.#meta = { ...this.#meta, version: v }
    return this
  }

  description(d: string): CommandBuilder<A> {
    this.#meta = { ...this.#meta, description: d }
    return this
  }

  example(e: string): CommandBuilder<A> {
    this.#examples.push(e)
    return this
  }

  option<K extends string, D extends Omit<ArgDef, 'type'>>(
    name: K,
    type: ArgDef['type'],
    def?: D,
  ): CommandBuilder<A & Record<K, ArgDef>> {
    this.#args[name] = { type, ...(def ?? {}) }
    return this as unknown as CommandBuilder<A & Record<K, ArgDef>>
  }

  flag<K extends string>(
    name: K,
    def?: Omit<ArgDef, 'type'>,
  ): CommandBuilder<A & Record<K, ArgDef>> {
    this.#args[name] = { type: 'boolean', ...(def ?? {}) }
    return this as unknown as CommandBuilder<A & Record<K, ArgDef>>
  }

  positional<K extends string>(
    name: K,
    def?: Omit<ArgDef, 'type'>,
  ): CommandBuilder<A & Record<K, ArgDef>> {
    this.#args[name] = { type: 'positional', ...(def ?? {}) }
    return this as unknown as CommandBuilder<A & Record<K, ArgDef>>
  }

  subCommand(name: string, child: Command): CommandBuilder<A> {
    this.#subCommands[name] = child
    return this
  }

  strict(b: boolean): CommandBuilder<A> {
    this.#strict = b
    return this
  }

  use(plugin: Plugin): CommandBuilder<A> {
    this.#plugins.push(plugin)
    return this
  }

  setup(fn: (ctx: RunContext<A>) => Promise<void> | void): CommandBuilder<A> {
    this.#setup = fn
    return this
  }

  action(fn: (ctx: RunContext<A>) => Promise<unknown> | unknown): CommandBuilder<A> {
    this.#action = fn
    return this
  }

  cleanup(
    fn: (ctx: RunContext<A> & { error?: unknown; result?: unknown }) => Promise<void> | void,
  ): CommandBuilder<A> {
    this.#cleanup = fn
    return this
  }

  build(): Command<A> {
    const meta: CommandMeta =
      this.#examples.length > 0 ? { ...this.#meta, examples: this.#examples } : this.#meta
    const config: Command<A> = {
      meta,
      args: this.#args as A,
      ...(Object.keys(this.#subCommands).length > 0 && {
        subCommands: this.#subCommands as SubCommands,
      }),
      ...(this.#strict !== undefined && { strict: this.#strict }),
      ...(this.#plugins.length > 0 && { plugins: this.#plugins }),
      ...(this.#setup && { setup: this.#setup }),
      ...(this.#action && { run: this.#action }),
      ...(this.#cleanup && { cleanup: this.#cleanup }),
    }
    return defineCommand(config)
  }
}

export function cli(name: string): CommandBuilder {
  return new Builder<Record<never, ArgDef>>(name)
}
