import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConfig, defineSchema } from '../src/index'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'cli-kit-config-'))
  await mkdir(path.join(tmp, 'config'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

async function writeConfig(name: string, body: object): Promise<void> {
  await writeFile(path.join(tmp, 'config', name), JSON.stringify(body), 'utf8')
}

describe('createConfig: layer precedence', () => {
  it('applies schema defaults when no files exist', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000 } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    expect(cfg.get('server.port')).toBe(3000)
    expect(cfg.source('server.port').layer).toBe('defaults')
  })

  it('default.json overrides schema defaults', async () => {
    await writeConfig('default.json', { server: { port: 4000 } })
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000 } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    expect(cfg.get('server.port')).toBe(4000)
    expect(cfg.source('server.port').layer).toBe('file:default')
  })

  it('{env}.json overrides default.json', async () => {
    await writeConfig('default.json', { server: { port: 4000 } })
    await writeConfig('production.json', { server: { port: 80 } })
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000 } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'production',
    })
    expect(cfg.get('server.port')).toBe(80)
    expect(cfg.source('server.port').layer).toBe('file:env')
  })

  it('env vars override files', async () => {
    await writeConfig('production.json', { server: { port: 80 } })
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000, env: 'PORT' } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'production',
      env: { PORT: '9090' },
    })
    expect(cfg.get('server.port')).toBe(9090)
    expect(cfg.source('server.port').layer).toBe('env')
  })

  it('CLI overrides env', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000, env: 'PORT' } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      env: { PORT: '9090' },
      cli: { 'server.port': 8080 },
    })
    expect(cfg.get('server.port')).toBe(8080)
    expect(cfg.source('server.port').layer).toBe('cli')
  })

  it('envPrefix auto-binds via UPPER_SNAKE_CASE path', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000 } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      envPrefix: 'MYAPP_',
      env: { MYAPP_SERVER_PORT: '7777' },
    })
    expect(cfg.get('server.port')).toBe(7777)
  })
})

describe('createConfig: validation', () => {
  it('collects validation errors when a file violates schema', async () => {
    await writeConfig('default.json', { server: { port: -1 } })
    const cfg = await createConfig({
      schema: defineSchema({
        server: { port: { type: 'integer', default: 3000, min: 1, max: 65535 } },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    expect(cfg.validationErrors.length).toBeGreaterThan(0)
    expect(cfg.get('server.port')).toBe(3000) // falls back to default
  })

  it('rejects strict-mode unknown keys', async () => {
    await writeConfig('default.json', { stranger: 'danger' })
    const cfg = await createConfig({
      schema: defineSchema({ known: { type: 'string', default: 'ok' } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    expect(cfg.validationErrors.some((e) => e.code === 'UNKNOWN_KEY')).toBe(true)
  })

  it('enum validation', async () => {
    await writeConfig('default.json', { mode: 'fast' })
    const cfg = await createConfig({
      schema: defineSchema({
        mode: { type: 'enum', values: ['slow', 'normal'], default: 'normal' },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    expect(cfg.validationErrors.some((e) => e.code === 'INVALID_VALUE')).toBe(true)
  })
})

describe('createConfig: runtime mutation', () => {
  it('set() overrides values', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        out: { type: 'enum', values: ['a', 'b'], default: 'a' },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    const r = cfg.set('out', 'b')
    expect(r.ok).toBe(true)
    expect(cfg.get('out')).toBe('b')
    expect(cfg.source('out').layer).toBe('runtime')
  })

  it('set() validates before applying', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        port: { type: 'integer', default: 3000, min: 1, max: 65535 },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    const r = cfg.set('port', 999999)
    expect(r.ok).toBe(false)
    expect(cfg.get('port')).toBe(3000)
  })

  it('reset() returns to file-loaded value', async () => {
    await writeConfig('default.json', { port: 4000 })
    const cfg = await createConfig({
      schema: defineSchema({ port: { type: 'integer', default: 3000 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    cfg.set('port', 5000)
    expect(cfg.get('port')).toBe(5000)
    cfg.reset('port')
    expect(cfg.get('port')).toBe(4000)
  })

  it('on(change) fires synchronously', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 1 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    const events: Array<[string, unknown, unknown]> = []
    cfg.on('change', (path, prev, next) => events.push([path, prev, next]))
    cfg.set('x', 2)
    expect(events).toEqual([['x', 1, 2]])
  })

  it('freezeAfterLoad blocks set()', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 1 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      freezeAfterLoad: true,
    })
    const r = cfg.set('x', 2)
    expect(r.ok).toBe(false)
    expect(cfg.get('x')).toBe(1)
  })
})

describe('createConfig: snapshot + redaction', () => {
  it('snapshot is frozen', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 1 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    const snap = cfg.snapshot() as Record<string, unknown>
    expect(Object.isFrozen(snap)).toBe(true)
    expect(() => {
      // @ts-expect-error testing immutability
      snap.x = 99
    }).toThrow()
  })

  it('redacts sensitive keys', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        secrets: {
          apiKey: { type: 'string', sensitive: true, default: 'supersecret' },
        },
        ok: { type: 'string', default: 'visible' },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    const snap = cfg.snapshot({ redactSensitive: true }) as Record<string, unknown>
    expect((snap.secrets as Record<string, unknown>).apiKey).toBe('[REDACTED]')
    expect(snap.ok).toBe('visible')
  })
})

describe('createConfig: security', () => {
  it('refuses path traversal in environment name', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'string', default: 'ok' } }),
      configDir: path.join(tmp, 'config'),
      environment: '../etc/passwd',
    })
    expect(cfg.validationErrors.length).toBeGreaterThan(0)
  })

  it('rejects __proto__ in JSON', async () => {
    // Write raw JSON: an object-literal `{__proto__: x}` would only set the
    // prototype slot, not produce a `"__proto__"` property in the serialised
    // output. Bypass the JS layer entirely.
    await writeFile(
      path.join(tmp, 'config', 'default.json'),
      '{"__proto__":{"polluted":true}}',
      'utf8',
    )
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'string', default: 'ok' } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    expect(cfg.validationErrors.some((e) => e.code === 'POLLUTION_ATTEMPT')).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: probe
    expect(({} as any).polluted).toBeUndefined()
  })
})

describe('createConfig: audit log', () => {
  it('returns empty array when audit is not enabled', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 1 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
    })
    cfg.set('x', 2)
    expect(cfg.auditLog()).toEqual([])
  })

  it('records set / reset / resetAll when audit is enabled', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 1 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      audit: true,
    })
    cfg.set('x', 2)
    cfg.set('x', 3)
    cfg.reset('x')
    cfg.resetAll()
    const log = cfg.auditLog()
    expect(log.length).toBe(4)
    expect(log[0]).toMatchObject({ op: 'set', path: 'x', previous: 1, next: 2 })
    expect(log[1]).toMatchObject({ op: 'set', path: 'x', previous: 2, next: 3 })
    expect(log[2]).toMatchObject({ op: 'reset', path: 'x', previous: 3, next: 1 })
    expect(log[3]).toMatchObject({ op: 'resetAll', path: '$' })
    for (const entry of log) {
      expect(typeof entry.at).toBe('string')
      expect(() => new Date(entry.at)).not.toThrow()
    }
  })

  it('redacts sensitive paths in the captured entry', async () => {
    const cfg = await createConfig({
      schema: defineSchema({
        apiKey: { type: 'string', sensitive: true, default: 'orig' },
      }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      audit: true,
    })
    cfg.set('apiKey', 'new-secret')
    const [entry] = cfg.auditLog()
    expect(entry).toBeDefined()
    expect(entry?.previous).toBe('[REDACTED]')
    expect(entry?.next).toBe('[REDACTED]')
  })

  it('bounded ring drops oldest entries past capacity', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 0 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      audit: true,
      auditCapacity: 3,
    })
    cfg.set('x', 1)
    cfg.set('x', 2)
    cfg.set('x', 3)
    cfg.set('x', 4)
    cfg.set('x', 5)
    const log = cfg.auditLog()
    expect(log.length).toBe(3)
    expect(log[0]?.next).toBe(3)
    expect(log[2]?.next).toBe(5)
  })

  it('returned array is a defensive copy', async () => {
    const cfg = await createConfig({
      schema: defineSchema({ x: { type: 'integer', default: 1 } }),
      configDir: path.join(tmp, 'config'),
      environment: 'development',
      audit: true,
    })
    cfg.set('x', 2)
    const snap = cfg.auditLog() as unknown as { length: number }
    expect(snap.length).toBe(1)
    cfg.set('x', 3)
    // Caller's snapshot didn't change.
    expect(snap.length).toBe(1)
    expect(cfg.auditLog().length).toBe(2)
  })
})
