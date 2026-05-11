import { MemoryAdapter } from '@simtabi/cli-kit-js-io'
import { describe, expect, it } from 'vitest'
import { DEFAULT_REDACT_KEYS, createLogger, redactFields } from '../src/index'

describe('createLogger: leveled output', () => {
  it('emits info and above at info level', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info' })
    log.error('e')
    log.warn('w')
    log.info('i')
    log.debug('d')
    log.trace('t')
    expect(io.stderr).toContain('e')
    expect(io.stdout).toContain('w')
    expect(io.stdout).toContain('i')
    expect(io.stdout).not.toContain('d')
    expect(io.stdout).not.toContain('t')
  })

  it('silent emits nothing', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'silent' })
    log.error('e')
    log.info('i')
    expect(io.stdout).toBe('')
    expect(io.stderr).toBe('')
  })

  it('trace emits everything', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'trace' })
    log.error('e')
    log.warn('w')
    log.info('i')
    log.debug('d')
    log.trace('t')
    expect(io.stderr).toContain('e')
    expect(io.stdout).toMatch(/w[\s\S]+i[\s\S]+d[\s\S]+t/)
  })

  it('errors route to stderr; non-errors route to stdout', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'trace' })
    log.error('an error')
    log.info('regular info')
    expect(io.stderr).toContain('an error')
    expect(io.stdout).toContain('regular info')
    expect(io.stdout).not.toContain('an error')
  })
})

describe('createLogger: structured fields', () => {
  it('appends key=value pairs in pretty mode', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info' })
    log.info('user signed in', { userId: 42, role: 'admin' })
    expect(io.stdout).toContain('userId=42')
    expect(io.stdout).toContain('role=admin')
  })

  it('JSON-quotes values with whitespace or special chars', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info' })
    log.info('msg', { description: 'has spaces' })
    expect(io.stdout).toContain('description="has spaces"')
  })

  it('child loggers inherit bound fields', () => {
    const io = new MemoryAdapter()
    const root = createLogger({ io, level: 'info', fields: { service: 'api' } })
    const child = root.child({ requestId: 'r-123' })
    child.info('handled')
    expect(io.stdout).toContain('service=api')
    expect(io.stdout).toContain('requestId=r-123')
  })

  it('per-call fields override bound fields', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info', fields: { env: 'dev' } })
    log.info('switching', { env: 'prod' })
    // The last one wins; field merging is shallow.
    expect(io.stdout).toContain('env=prod')
  })
})

describe('createLogger: JSON format', () => {
  it('emits NDJSON', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info', format: 'json' })
    log.info('hello', { x: 1 })
    const line = io.stdout.trim()
    const parsed = JSON.parse(line) as Record<string, unknown>
    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('hello')
    expect(parsed.x).toBe(1)
    expect(typeof parsed.time).toBe('string')
  })
})

describe('createLogger: redaction', () => {
  it('redacts default sensitive keys', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info' })
    log.info('signing in', {
      userId: 1,
      password: 'hunter2',
      token: 'bearer-xyz',
      apiKey: 'ak-1',
      authorization: 'Basic abc',
    })
    expect(io.stdout).toContain('userId=1')
    expect(io.stdout).toContain('password=[REDACTED]')
    expect(io.stdout).toContain('token=[REDACTED]')
    expect(io.stdout).toContain('apiKey=[REDACTED]')
    expect(io.stdout).toContain('authorization=[REDACTED]')
    expect(io.stdout).not.toContain('hunter2')
    expect(io.stdout).not.toContain('bearer-xyz')
  })

  it('case-insensitive match', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info' })
    log.info('m', { PASSWORD: 'x', Token: 'y' })
    expect(io.stdout).not.toContain('x')
    expect(io.stdout).not.toContain('y')
  })

  it('redacts nested objects', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info', format: 'json' })
    log.info('m', { ctx: { user: 'alice', password: 'secret' } })
    const parsed = JSON.parse(io.stdout.trim()) as Record<string, unknown>
    const ctx = parsed.ctx as Record<string, unknown>
    expect(ctx.user).toBe('alice')
    expect(ctx.password).toBe('[REDACTED]')
  })

  it('custom redactKeys override default', () => {
    const io = new MemoryAdapter()
    const log = createLogger({ io, level: 'info', redactKeys: ['ssn'] })
    log.info('m', { ssn: '123-45-6789', password: 'visible' })
    expect(io.stdout).toContain('ssn=[REDACTED]')
    expect(io.stdout).toContain('password=visible')
  })

  it('DEFAULT_REDACT_KEYS is exported', () => {
    expect(DEFAULT_REDACT_KEYS).toContain('password')
    expect(DEFAULT_REDACT_KEYS).toContain('token')
    expect(DEFAULT_REDACT_KEYS).toContain('secret')
    expect(DEFAULT_REDACT_KEYS).toContain('authorization')
  })
})

describe('redactFields: standalone', () => {
  it('returns a shallow-redacted copy', () => {
    const r = redactFields({ a: 1, password: 'p' }, ['password'])
    expect(r).toEqual({ a: 1, password: '[REDACTED]' })
  })

  it('does not mutate input', () => {
    const input = { password: 'p' }
    redactFields(input, ['password'])
    expect(input.password).toBe('p')
  })
})
