import { describe, expect, it } from 'vitest'
import { SecureString } from '../src/index'

describe('SecureString', () => {
  it('appends + reads ASCII', () => {
    const s = new SecureString()
    s.appendChar('h')
    s.appendChar('i')
    expect(s.length).toBe(2)
    expect(s.read()).toBe('hi')
    expect(s.isDisposed).toBe(true)
  })

  it('appends + reads multi-byte UTF-8', () => {
    const s = new SecureString()
    s.appendChar('日')
    s.appendChar('本')
    s.appendChar('語')
    expect(s.byteLength).toBe(9) // each kanji = 3 UTF-8 bytes
    expect(s.read()).toBe('日本語')
  })

  it('popChar removes one codepoint at a time (UTF-8 aware)', () => {
    const s = new SecureString()
    s.appendChar('日')
    s.appendChar('本')
    s.popChar()
    expect(s.peek()).toBe('日')
    s.popChar()
    expect(s.peek()).toBe('')
    s.popChar() // no-op on empty
    expect(s.length).toBe(0)
  })

  it('peek does not dispose', () => {
    const s = new SecureString()
    s.appendChar('a')
    expect(s.peek()).toBe('a')
    expect(s.peek()).toBe('a') // still accessible
    expect(s.isDisposed).toBe(false)
    s.appendChar('b')
    expect(s.peek()).toBe('ab')
  })

  it('read after dispose throws', () => {
    const s = new SecureString()
    s.appendChar('x')
    s.read()
    expect(() => s.read()).toThrow(/disposed/)
    expect(() => s.peek()).toThrow(/disposed/)
    expect(() => s.appendChar('y')).toThrow(/disposed/)
    expect(() => s.popChar()).toThrow(/disposed/)
  })

  it('dispose is idempotent', () => {
    const s = new SecureString()
    s.appendChar('x')
    s.dispose()
    s.dispose() // no throw
    expect(s.isDisposed).toBe(true)
  })

  it('rejects > MAX_CAPACITY bytes', () => {
    const s = new SecureString()
    // 4096 bytes worth
    const oneKB = 'a'.repeat(1024)
    for (let i = 0; i < 4; i++) s.appendChar(oneKB) // 4 KiB exactly
    expect(() => s.appendChar('x')).toThrow(/maximum/)
  })

  it('grows backing buffer as needed', () => {
    const s = new SecureString()
    for (let i = 0; i < 128; i++) s.appendChar('a')
    expect(s.length).toBe(128)
    expect(s.peek()).toBe('a'.repeat(128))
  })

  it('zeros bytes during popChar (defence in depth)', () => {
    // We can't observe the underlying bytes from outside, but we can verify
    // that peek after pop returns only the kept prefix.
    const s = new SecureString()
    s.appendChar('s')
    s.appendChar('e')
    s.appendChar('c')
    s.appendChar('r')
    s.appendChar('e')
    s.appendChar('t')
    expect(s.peek()).toBe('secret')
    s.popChar()
    s.popChar()
    expect(s.peek()).toBe('secr')
    // Appending should overwrite the previously-occupied space cleanly.
    s.appendChar('!')
    expect(s.peek()).toBe('secr!')
  })
})
