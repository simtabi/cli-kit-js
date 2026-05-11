import { MemoryAdapter, answer } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { password } from '../src/index'

describe('password prompt', () => {
  it('returns the buffer without revealing chars in stdout', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    answer(io, 's', 'e', 'c', 'r', 'e', 't', 'enter')
    const r = await password({ io, message: 'Password?' })
    expect(r).toBe('secret')
    // Raw writes never contain the actual chars in sequence
    const all = io.rawWrites.join('')
    expect(all).not.toContain('secret')
    // …but mask chars do appear
    expect(all).toContain('*')
  })

  it('custom mask', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24 })
    answer(io, 'a', 'b', 'enter')
    await password({ io, message: 'pw?', mask: '#' })
    const all = io.rawWrites.join('')
    expect(all).toContain('#')
    expect(all).not.toContain('*')
  })

  it('non-TTY: reads a line', async () => {
    const io = new MemoryAdapter({ isTTY: false })
    answer.line(io, 'pipedsecret')
    const r = await password({ io, message: 'pw?' })
    expect(r).toBe('pipedsecret')
  })
})
