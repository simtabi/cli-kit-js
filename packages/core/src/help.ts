/**
 * Help generation: pretty (TTY), JSON, Markdown, and man-page (groff) formats.
 */

import { colors as defaultColors, type ColorDepth, createColors } from '@simtabi/cli-kit-js-ansi'
import { pad, width } from '@simtabi/cli-kit-js-text'
import { isLazyCommand } from './lazy'
import type { Command, SubCommands } from './types'

export type HelpFormat = 'text' | 'json' | 'markdown' | 'man'

export interface RenderHelpOptions {
  readonly format?: HelpFormat
  readonly colorDepth?: ColorDepth
  /** Full command path leading to this command (e.g. `['mycli', 'build']`). */
  readonly path?: readonly string[]
  /** Maximum line width — defaults to 100 columns. */
  readonly columns?: number
}

export function renderHelp(command: Command, opts: RenderHelpOptions = {}): string {
  const format = opts.format ?? 'text'
  switch (format) {
    case 'text':
      return renderText(command, opts)
    case 'json':
      return JSON.stringify(commandToJSON(command, opts.path ?? [command.meta.name]), null, 2)
    case 'markdown':
      return renderMarkdown(command, opts.path ?? [command.meta.name])
    case 'man':
      return renderMan(command, opts.path ?? [command.meta.name])
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Text (TTY)
// ──────────────────────────────────────────────────────────────────────────────

function renderText(command: Command, opts: RenderHelpOptions): string {
  const colors =
    opts.colorDepth !== undefined ? createColors({ depth: opts.colorDepth }) : defaultColors
  const path = opts.path ?? [command.meta.name]
  const cols = Math.max(40, opts.columns ?? 100)
  const lines: string[] = []

  // Header
  const title = colors.bold(path.join(' '))
  if (command.meta.version) {
    lines.push(`${title} ${colors.gray(`v${command.meta.version}`)}`)
  } else {
    lines.push(title)
  }
  if (command.meta.description) {
    lines.push(colors.gray(command.meta.description))
  }
  lines.push('')

  // Usage
  let usage = `${colors.bold('USAGE:')} ${colors.cyan(path.join(' '))}`
  const hasSubs = !!command.subCommands && Object.keys(command.subCommands).length > 0
  if (hasSubs) usage += ` ${colors.yellow('<command>')}`
  usage += ` ${colors.yellow('[options]')}`
  for (const [name, def] of optionalArgs(command, 'positional')) {
    const tok = def.required ? `<${name}>` : `[${name}]`
    usage += ' '
    usage += def.required ? colors.red(tok) : colors.yellow(tok)
    if (def.rest) usage += colors.gray('...')
  }
  lines.push(usage)
  lines.push('')

  // Subcommands
  if (hasSubs) {
    lines.push(colors.bold('COMMANDS:'))
    const entries = Object.entries(command.subCommands ?? {})
    const visible = entries.filter(([, c]) => isLazyCommand(c) || !c.meta.hidden)
    const maxName = Math.max(...visible.map(([n]) => width(n)), 0)
    for (const [name, sub] of visible) {
      const desc =
        isLazyCommand(sub) ? '' : sub.meta.description ?? ''
      lines.push(`  ${colors.cyan(pad(name, maxName))}  ${colors.gray(desc)}`)
    }
    lines.push('')
  }

  // Options
  const opts2 = optionalArgs(command, 'option')
  if (opts2.length > 0) {
    lines.push(colors.bold('OPTIONS:'))
    const items: Array<{ flags: string; help: string }> = []
    for (const [name, def] of opts2) {
      const aliasStr = def.alias
        ? `-${Array.isArray(def.alias) ? def.alias[0] : def.alias}, `
        : '    '
      let flags = `  ${aliasStr}--${name}`
      if (def.type !== 'boolean' && def.type !== 'count') {
        flags += ` <${def.type}>`
      }
      let help = ''
      if (def.description) help += def.description
      if (def.default !== undefined) help += ` ${colors.gray(`(default: ${JSON.stringify(def.default)})`)}`
      if (def.required) help += ` ${colors.red('[required]')}`
      if (def.env) help += ` ${colors.gray(`[env: ${Array.isArray(def.env) ? def.env.join(', ') : def.env}]`)}`
      items.push({ flags, help })
    }
    const maxFlags = Math.max(...items.map((i) => width(i.flags)))
    for (const item of items) {
      lines.push(`${pad(item.flags, maxFlags)}  ${item.help}`)
    }
    lines.push('')
  }

  // Positionals
  const positionals = optionalArgs(command, 'positional')
  if (positionals.length > 0) {
    lines.push(colors.bold('ARGUMENTS:'))
    const maxName = Math.max(...positionals.map(([n]) => width(n)))
    for (const [name, def] of positionals) {
      let line = `  ${colors.yellow(pad(name, maxName))}  `
      if (def.description) line += def.description
      if (def.required) line += ` ${colors.red('[required]')}`
      if (def.rest) line += ` ${colors.gray('(...rest)')}`
      lines.push(line)
    }
    lines.push('')
  }

  // Examples
  if (command.meta.examples && command.meta.examples.length > 0) {
    lines.push(colors.bold('EXAMPLES:'))
    for (const ex of command.meta.examples) {
      lines.push(`  ${ex}`)
    }
    lines.push('')
  }

  // Soft-wrap final output to `cols` columns
  return lines.join('\n').replace(/\n+$/, '\n')
}

// ──────────────────────────────────────────────────────────────────────────────
// JSON
// ──────────────────────────────────────────────────────────────────────────────

interface CommandJSON {
  readonly name: string
  readonly path: readonly string[]
  readonly version?: string
  readonly description?: string
  readonly args?: Record<string, unknown>
  readonly subCommands?: Record<string, CommandJSON | { readonly lazy: true; readonly name: string }>
  readonly examples?: readonly string[]
  readonly strict?: boolean
}

function commandToJSON(command: Command, path: readonly string[]): CommandJSON {
  const json: CommandJSON = {
    name: command.meta.name,
    path,
    ...(command.meta.version !== undefined && { version: command.meta.version }),
    ...(command.meta.description !== undefined && { description: command.meta.description }),
    ...(command.args && { args: argsToJSON(command.args) }),
    ...(command.subCommands && { subCommands: subCommandsToJSON(command.subCommands, path) }),
    ...(command.meta.examples && { examples: command.meta.examples }),
    ...(command.strict !== undefined && { strict: command.strict }),
  }
  return json
}

function argsToJSON(args: Command['args']): Record<string, unknown> {
  if (!args) return {}
  const out: Record<string, unknown> = {}
  for (const [name, def] of Object.entries(args)) {
    // Filter out function values (shouldn't appear, but defensive)
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(def)) {
      if (typeof v !== 'function') safe[k] = v
    }
    out[name] = safe
  }
  return out
}

function subCommandsToJSON(
  subs: SubCommands,
  parentPath: readonly string[],
): Record<string, CommandJSON | { readonly lazy: true; readonly name: string }> {
  const out: Record<string, CommandJSON | { readonly lazy: true; readonly name: string }> = {}
  for (const [name, c] of Object.entries(subs)) {
    if (isLazyCommand(c)) {
      out[name] = { lazy: true, name }
    } else {
      out[name] = commandToJSON(c, [...parentPath, name])
    }
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Markdown
// ──────────────────────────────────────────────────────────────────────────────

function renderMarkdown(command: Command, path: readonly string[]): string {
  const lines: string[] = []
  const title = path.join(' ')
  lines.push(`# \`${title}\``)
  lines.push('')
  if (command.meta.description) {
    lines.push(command.meta.description)
    lines.push('')
  }

  // Usage
  let usage = `\`${title}`
  if (command.subCommands && Object.keys(command.subCommands).length > 0) usage += ' <command>'
  usage += ' [options]'
  for (const [name, def] of optionalArgs(command, 'positional')) {
    usage += def.required ? ` <${name}>` : ` [${name}]`
    if (def.rest) usage += '...'
  }
  usage += '`'
  lines.push('## Usage')
  lines.push('')
  lines.push(usage)
  lines.push('')

  // Subcommands
  if (command.subCommands && Object.keys(command.subCommands).length > 0) {
    lines.push('## Commands')
    lines.push('')
    lines.push('| Command | Description |')
    lines.push('| --- | --- |')
    for (const [name, sub] of Object.entries(command.subCommands)) {
      const desc = isLazyCommand(sub) ? '_(lazy-loaded)_' : sub.meta.description ?? ''
      lines.push(`| \`${name}\` | ${desc} |`)
    }
    lines.push('')
  }

  // Options
  const opts = optionalArgs(command, 'option')
  if (opts.length > 0) {
    lines.push('## Options')
    lines.push('')
    lines.push('| Flag | Type | Default | Description |')
    lines.push('| --- | --- | --- | --- |')
    for (const [name, def] of opts) {
      const flag = def.alias
        ? `\`-${Array.isArray(def.alias) ? def.alias[0] : def.alias}\`, \`--${name}\``
        : `\`--${name}\``
      const def_ = def.default !== undefined ? `\`${JSON.stringify(def.default)}\`` : ''
      lines.push(`| ${flag} | \`${def.type}\` | ${def_} | ${def.description ?? ''} |`)
    }
    lines.push('')
  }

  // Examples
  if (command.meta.examples && command.meta.examples.length > 0) {
    lines.push('## Examples')
    lines.push('')
    for (const ex of command.meta.examples) {
      lines.push(`\`\`\`bash`)
      lines.push(ex)
      lines.push(`\`\`\``)
      lines.push('')
    }
  }
  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────────
// Man page (groff)
// ──────────────────────────────────────────────────────────────────────────────

function renderMan(command: Command, path: readonly string[]): string {
  const name = path.join('-')
  const lines: string[] = []
  const date = new Date().toISOString().slice(0, 10)
  const version = command.meta.version ?? '0.0.0'
  lines.push(`.TH ${name.toUpperCase()} 1 "${date}" "${version}" "User Commands"`)
  lines.push('.SH NAME')
  lines.push(`${name} \\- ${command.meta.description ?? path.join(' ')}`)
  lines.push('.SH SYNOPSIS')
  let synopsis = `\\fB${path.join(' ')}\\fR`
  if (command.subCommands && Object.keys(command.subCommands).length > 0) {
    synopsis += ' [\\fIcommand\\fR]'
  }
  synopsis += ' [\\fIoptions\\fR]'
  for (const [n, def] of optionalArgs(command, 'positional')) {
    synopsis += def.required ? ` \\fI${n}\\fR` : ` [\\fI${n}\\fR]`
  }
  lines.push(synopsis)
  if (command.meta.description) {
    lines.push('.SH DESCRIPTION')
    lines.push(command.meta.description)
  }
  const opts = optionalArgs(command, 'option')
  if (opts.length > 0) {
    lines.push('.SH OPTIONS')
    for (const [n, def] of opts) {
      lines.push('.TP')
      const alias = def.alias ? `\\fB-${Array.isArray(def.alias) ? def.alias[0] : def.alias}\\fR, ` : ''
      lines.push(`${alias}\\fB--${n}\\fR`)
      if (def.description) lines.push(def.description)
    }
  }
  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function optionalArgs(
  command: Command,
  kind: 'option' | 'positional',
): Array<readonly [string, NonNullable<Command['args']>[string]]> {
  if (!command.args) return []
  const out: Array<readonly [string, NonNullable<Command['args']>[string]]> = []
  for (const [name, def] of Object.entries(command.args)) {
    const isPositional = def.type === 'positional'
    if (kind === 'positional' && isPositional) out.push([name, def] as const)
    if (kind === 'option' && !isPositional) out.push([name, def] as const)
  }
  return out
}
