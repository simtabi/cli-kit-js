import { describe, expect, it } from 'vitest'
import { cli, defineCommand } from '../src/index'

describe('defineCommand', () => {
  it('returns a frozen Command', () => {
    const cmd = defineCommand({
      meta: { name: 'hi' },
      args: { name: { type: 'string', default: 'World' } },
      run: () => undefined,
    })
    expect(Object.isFrozen(cmd)).toBe(true)
    expect(Object.isFrozen(cmd.meta)).toBe(true)
    expect(cmd.args && Object.isFrozen(cmd.args)).toBe(true)
  })

  it('throws when meta.name is missing', () => {
    expect(() =>
      // @ts-expect-error testing runtime validation
      defineCommand({ meta: {}, run: () => undefined }),
    ).toThrow(/meta.name/)
  })

  it('rejects parent commands with both positionals and subcommands', () => {
    expect(() =>
      defineCommand({
        meta: { name: 'p' },
        args: { what: { type: 'positional' } },
        subCommands: {
          x: defineCommand({ meta: { name: 'x' }, run: () => undefined }),
        },
      }),
    ).toThrow(/positional .* cannot coexist with subCommands/)
  })

  it('rejects positionals declared after a rest positional', () => {
    expect(() =>
      defineCommand({
        meta: { name: 'p' },
        args: {
          first: { type: 'positional', rest: true },
          second: { type: 'positional' },
        },
        run: () => undefined,
      }),
    ).toThrow(/declared after a rest positional/)
  })
})

describe('cli() fluent builder', () => {
  it('builds an equivalent Command', () => {
    const cmd = cli('build')
      .version('1.0.0')
      .description('Build the project')
      .option('output', 'string', { alias: 'o', default: 'dist/' })
      .flag('verbose', { alias: 'v' })
      .action(() => 'ok')
      .build()
    expect(cmd.meta.name).toBe('build')
    expect(cmd.meta.version).toBe('1.0.0')
    expect(cmd.meta.description).toBe('Build the project')
    expect(cmd.args?.output).toEqual({
      type: 'string',
      alias: 'o',
      default: 'dist/',
    })
    expect(cmd.args?.verbose).toEqual({ type: 'boolean', alias: 'v' })
    expect(cmd.run?.({} as never)).toBe('ok')
  })

  it('chains examples into meta', () => {
    const cmd = cli('demo').example('demo --foo').example('demo --bar').build()
    expect(cmd.meta.examples).toEqual(['demo --foo', 'demo --bar'])
  })

  it('attaches subcommands', () => {
    const child = defineCommand({ meta: { name: 'child' }, run: () => undefined })
    const cmd = cli('parent').subCommand('child', child).build()
    expect(cmd.subCommands?.child).toBe(child)
  })

  it('produces a frozen result', () => {
    const cmd = cli('x').build()
    expect(Object.isFrozen(cmd)).toBe(true)
  })
})
