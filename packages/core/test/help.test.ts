import { describe, expect, it } from 'vitest'
import { defineCommand, renderHelp } from '../src/index'

const sample = defineCommand({
  meta: {
    name: 'mycli',
    version: '1.0.0',
    description: 'A demo CLI',
    examples: ['mycli --name World'],
  },
  args: {
    name: { type: 'string', alias: 'n', description: 'name to greet', default: 'World' },
    verbose: { type: 'boolean', alias: 'v', description: 'verbose mode' },
  },
  run: () => undefined,
})

const parent = defineCommand({
  meta: { name: 'tool' },
  subCommands: {
    build: defineCommand({
      meta: { name: 'build', description: 'Build' },
      run: () => undefined,
    }),
    test: defineCommand({
      meta: { name: 'test', description: 'Test' },
      run: () => undefined,
    }),
  },
})

describe('renderHelp: text', () => {
  it('includes name and version in header', () => {
    const txt = renderHelp(sample, { format: 'text', colorDepth: 0 })
    expect(txt).toContain('mycli')
    expect(txt).toContain('v1.0.0')
  })

  it('includes description', () => {
    const txt = renderHelp(sample, { format: 'text', colorDepth: 0 })
    expect(txt).toContain('A demo CLI')
  })

  it('renders options table', () => {
    const txt = renderHelp(sample, { format: 'text', colorDepth: 0 })
    expect(txt).toContain('--name')
    expect(txt).toContain('-n')
    expect(txt).toContain('name to greet')
  })

  it('renders defaults and required markers', () => {
    const cmd = defineCommand({
      meta: { name: 'x' },
      args: {
        out: { type: 'string', default: 'dist/', description: 'where' },
        host: { type: 'string', required: true, description: 'host' },
      },
      run: () => undefined,
    })
    const txt = renderHelp(cmd, { format: 'text', colorDepth: 0 })
    expect(txt).toContain('default')
    expect(txt).toContain('[required]')
  })

  it('lists subcommands', () => {
    const txt = renderHelp(parent, { format: 'text', colorDepth: 0 })
    expect(txt).toContain('build')
    expect(txt).toContain('test')
  })

  it('renders examples', () => {
    const txt = renderHelp(sample, { format: 'text', colorDepth: 0 })
    expect(txt).toContain('mycli --name World')
  })
})

describe('renderHelp: json', () => {
  it('returns parseable JSON', () => {
    const json = renderHelp(sample, { format: 'json' })
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.name).toBe('mycli')
    expect(parsed.version).toBe('1.0.0')
    expect(parsed.args).toBeDefined()
  })

  it('serialises subcommands recursively', () => {
    const json = renderHelp(parent, { format: 'json' })
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.subCommands).toBeDefined()
    const subs = parsed.subCommands as Record<string, Record<string, unknown>>
    expect(subs.build?.name).toBe('build')
  })
})

describe('renderHelp: markdown', () => {
  it('produces a markdown header', () => {
    const md = renderHelp(sample, { format: 'markdown' })
    expect(md).toContain('# `mycli`')
    expect(md).toContain('## Usage')
    expect(md).toContain('## Options')
  })

  it('emits a table for options', () => {
    const md = renderHelp(sample, { format: 'markdown' })
    expect(md).toMatch(/\| Flag \| Type \| Default \| Description \|/)
  })
})

describe('renderHelp: man', () => {
  it('produces groff sections', () => {
    const man = renderHelp(sample, { format: 'man' })
    expect(man).toContain('.TH MYCLI 1')
    expect(man).toContain('.SH NAME')
    expect(man).toContain('.SH SYNOPSIS')
  })
})
