import { describe, expect, it } from 'vitest'
import { parse } from '../src/index'
import type { ArgDef } from '../src/index'

const def = <T extends ArgDef>(d: T): T => d

describe('parse: long flags', () => {
  it('parses --name value', () => {
    const r = parse(['--name', 'World'], {
      args: { name: def({ type: 'string' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.name).toBe('World')
  })

  it('parses --name=value', () => {
    const r = parse(['--name=World'], {
      args: { name: def({ type: 'string' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.name).toBe('World')
  })

  it('boolean flag without value defaults true', () => {
    const r = parse(['--verbose'], {
      args: { verbose: def({ type: 'boolean' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.verbose).toBe(true)
  })

  it('--no-flag sets boolean false', () => {
    const r = parse(['--no-verbose'], {
      args: { verbose: def({ type: 'boolean', default: true }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.verbose).toBe(false)
  })

  it('--no-flag works on non-boolean (sets undefined-ish defaults)', () => {
    const r = parse(['--no-output'], {
      args: { output: def({ type: 'string' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.output).toBe(false)
  })

  it('--no-count resets count to 0', () => {
    const r = parse(['-vvv', '--no-verbose'], {
      args: { verbose: def({ type: 'count', alias: 'v' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.verbose).toBe(0)
  })
})

describe('parse: short flags', () => {
  it('parses -n value', () => {
    const r = parse(['-n', 'World'], {
      args: { name: def({ type: 'string', alias: 'n' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.name).toBe('World')
  })

  it('parses cluster -abc as booleans', () => {
    const r = parse(['-abc'], {
      args: {
        a: def({ type: 'boolean' }),
        b: def({ type: 'boolean' }),
        c: def({ type: 'boolean' }),
      },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values).toMatchObject({ a: true, b: true, c: true })
  })

  it('cluster ending in value-taking flag consumes next token', () => {
    const r = parse(['-vn', 'World'], {
      args: {
        v: def({ type: 'boolean' }),
        name: def({ type: 'string', alias: 'n' }),
      },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.v).toBe(true)
    expect(r.result.values.name).toBe('World')
  })

  it('cluster with embedded value: -n5', () => {
    const r = parse(['-n5'], {
      args: { num: def({ type: 'integer', alias: 'n' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.num).toBe(5)
  })

  it('cluster with = form: -n=5', () => {
    const r = parse(['-n=5'], {
      args: { num: def({ type: 'integer', alias: 'n' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.num).toBe(5)
  })

  it('counts -vvv', () => {
    const r = parse(['-vvv'], {
      args: { verbose: def({ type: 'count', alias: 'v' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.verbose).toBe(3)
  })
})

describe('parse: alias canonicalization (regression: legacy parser inverted this)', () => {
  it('puts value on canonical key, not alias', () => {
    const r = parse(['-n', 'John'], {
      args: { name: def({ type: 'string', alias: 'n' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.name).toBe('John')
    expect(r.result.values.n).toBeUndefined()
  })

  it('handles array of aliases', () => {
    const r = parse(['--nm', 'John'], {
      args: { name: def({ type: 'string', alias: ['n', 'nm'] }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.name).toBe('John')
  })
})

describe('parse: negative numbers (regression: legacy rejected these)', () => {
  it('accepts --count -5', () => {
    const r = parse(['--count', '-5'], {
      args: { count: def({ type: 'integer' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.count).toBe(-5)
  })

  it('accepts --rate -3.14', () => {
    const r = parse(['--rate', '-3.14'], {
      args: { rate: def({ type: 'number' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.rate).toBeCloseTo(-3.14)
  })
})

describe('parse: boolean coercion symmetry', () => {
  for (const truthy of ['true', '1', 'yes', 'y', 'on', 'TRUE', 'Yes']) {
    it(`coerces ${truthy} → true`, () => {
      const r = parse([`--flag=${truthy}`], {
        args: { flag: def({ type: 'boolean' }) },
      })
      expect(r.result.values.flag).toBe(true)
    })
  }
  for (const falsy of ['false', '0', 'no', 'n', 'off', 'False']) {
    it(`coerces ${falsy} → false`, () => {
      const r = parse([`--flag=${falsy}`], {
        args: { flag: def({ type: 'boolean' }) },
      })
      expect(r.result.values.flag).toBe(false)
    })
  }
})

describe('parse: arrays and positionals', () => {
  it('repeats option into array', () => {
    const r = parse(['-I', 'a', '-I', 'b', '-I', 'c'], {
      args: { include: def({ type: 'string', alias: 'I', array: true }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.include).toEqual(['a', 'b', 'c'])
  })

  it('maps positionals in declaration order', () => {
    const r = parse(['build', 'src', 'dist'], {
      args: {
        cmd: def({ type: 'positional', required: true }),
        input: def({ type: 'positional' }),
        output: def({ type: 'positional' }),
      },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values).toMatchObject({ cmd: 'build', input: 'src', output: 'dist' })
  })

  it('rest positional collects remainder', () => {
    const r = parse(['cp', 'a', 'b', 'c', 'dest'], {
      args: {
        cmd: def({ type: 'positional' }),
        files: def({ type: 'positional', rest: true }),
      },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.files).toEqual(['a', 'b', 'c', 'dest'])
  })
})

describe('parse: -- separator', () => {
  it('routes everything after -- to rest', () => {
    const r = parse(['--name', 'foo', '--', '--bar', '-x', 'whatever'], {
      args: { name: def({ type: 'string' }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.name).toBe('foo')
    expect(r.result.rest).toEqual(['--bar', '-x', 'whatever'])
  })
})

describe('parse: strict mode', () => {
  it('rejects unknown flag in strict (default)', () => {
    const r = parse(['--unknown=x'], { args: {} })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('UNKNOWN_FLAG')
  })

  it('collects unknowns in non-strict', () => {
    const r = parse(['--unknown=x'], { args: {}, strict: false })
    expect(r.ok).toBe(true)
    expect(r.result.unknown).toContain('unknown')
    expect(r.result.values.unknown).toBe('x')
  })
})

describe('parse: prototype pollution defense', () => {
  it('rejects __proto__ as flag name', () => {
    const r = parse(['--__proto__=polluted'], { args: {}, strict: true })
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.code === 'POLLUTION_ATTEMPT' || e.code === 'UNKNOWN_FLAG')).toBe(true)
    // Confirm Object.prototype not polluted
    // biome-ignore lint/suspicious/noExplicitAny: introspecting pollution
    expect(({} as any).polluted).toBeUndefined()
  })

  it('result object has null prototype', () => {
    const r = parse(['--name=foo'], {
      args: { name: def({ type: 'string' }) },
    })
    expect(Object.getPrototypeOf(r.result.values)).toBeNull()
  })

  it('refuses constructor / prototype flag names', () => {
    const r = parse(['--prototype=x', '--constructor=y'], {
      args: {},
      strict: false,
    })
    // No values written under these names
    // biome-ignore lint/suspicious/noExplicitAny: introspection
    expect((r.result.values as any).prototype).toBeUndefined()
    // biome-ignore lint/suspicious/noExplicitAny: introspection
    expect((r.result.values as any).constructor).toBeUndefined()
  })
})

describe('parse: DoS caps', () => {
  it('rejects argv with too many tokens', () => {
    const huge = Array.from({ length: 20_000 }, (_, i) => `--x${i}`)
    const r = parse(huge, { args: {}, strict: false })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('TOO_MANY_TOKENS')
  })

  it('rejects argv with too many bytes', () => {
    const big = 'a'.repeat(2_000_000)
    const r = parse([big], { args: {}, strict: false })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('INPUT_TOO_LARGE')
  })
})

describe('parse: required validation', () => {
  it('errors on missing required option', () => {
    const r = parse([], {
      args: { name: def({ type: 'string', required: true }) },
    })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('MISSING_REQUIRED')
  })

  it('errors on missing required positional', () => {
    const r = parse([], {
      args: { input: def({ type: 'positional', required: true }) },
    })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('MISSING_REQUIRED')
  })
})

describe('parse: env-var fallback', () => {
  it('reads env when flag not provided', () => {
    const r = parse([], {
      args: { port: def({ type: 'integer', env: 'PORT', default: 3000 }) },
      env: { PORT: '8080' },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.port).toBe(8080)
  })

  it('CLI flag overrides env', () => {
    const r = parse(['--port', '9090'], {
      args: { port: def({ type: 'integer', env: 'PORT' }) },
      env: { PORT: '8080' },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.port).toBe(9090)
  })
})

describe('parse: enum validation', () => {
  it('rejects value not in enum', () => {
    const r = parse(['--mode=fast'], {
      args: { mode: def({ type: 'string', values: ['slow', 'normal'] }) },
    })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('INVALID_ENUM')
  })

  it('accepts value in enum', () => {
    const r = parse(['--mode=slow'], {
      args: { mode: def({ type: 'string', values: ['slow', 'normal'] }) },
    })
    expect(r.ok).toBe(true)
    expect(r.result.values.mode).toBe('slow')
  })
})

describe('parse: type coercion errors', () => {
  it('rejects non-integer for integer type', () => {
    const r = parse(['--n', 'abc'], {
      args: { n: def({ type: 'integer' }) },
    })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.code).toBe('INVALID_VALUE')
  })
})
