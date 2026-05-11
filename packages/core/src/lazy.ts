/**
 * Lazy subcommand resolution. A subcommand can be `Command | () => Promise<Command | { default: Command }>`.
 */

import type { Command, CommandLike, LazyCommand, SubCommands } from './types'

export function isLazyCommand(x: Command | LazyCommand): x is LazyCommand {
  return typeof x === 'function'
}

export async function resolveSubCommand(
  subCommands: SubCommands,
  name: string,
): Promise<Command | null> {
  const entry = subCommands[name]
  if (entry === undefined) return null
  if (!isLazyCommand(entry)) return entry
  const loaded = await entry()
  return unwrap(loaded)
}

function unwrap(value: CommandLike): Command {
  if (value !== null && typeof value === 'object' && 'default' in value) {
    return value.default
  }
  return value as Command
}
