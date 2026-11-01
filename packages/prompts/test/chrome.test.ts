import { MemoryAdapter } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { intro, note, outro, rail } from '../src/index'

describe('chrome helpers', () => {
  it('intro renders top-bracket + bold message', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24, unicode: true })
    intro(io, 'Setup')
    expect(io.stdout).toContain('┌')
    expect(io.stdout).toContain('Setup')
  })

  it('outro renders bottom-bracket', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24, unicode: true })
    outro(io, 'Done!')
    expect(io.stdout).toContain('└')
    expect(io.stdout).toContain('Done!')
  })

  it('note renders mid-rail per line', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24, unicode: true })
    note(io, 'one\ntwo')
    const lines = io.stdout.split('\n').filter((l) => l.includes('│'))
    expect(lines.length).toBe(2)
  })

  it('rail renders an empty mid-rail line', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 24, unicode: true })
    rail(io)
    expect(io.stdout).toContain('│')
  })

  it('ASCII fallback when unicode is off', async () => {
    const io = new MemoryAdapter({ isTTY: true, color: 0, unicode: false })
    intro(io, 'Hi')
    note(io, 'mid')
    outro(io, 'Bye')
    expect(io.stdout).not.toContain('┌')
    expect(io.stdout).not.toContain('│')
    expect(io.stdout).not.toContain('└')
    expect(io.stdout).toContain(',')
    expect(io.stdout).toContain('|')
    expect(io.stdout).toContain('`')
  })
})
