import { describe, expect, it } from 'vitest'
import { detectColorDepth, detectCursorMoves, detectHyperlinks, detectUnicode } from '../src/index'

describe('detectColorDepth', () => {
  it('returns 0 when CLIKIT_DETERMINISTIC=1', () => {
    expect(
      detectColorDepth({
        env: { CLIKIT_DETERMINISTIC: '1', COLORTERM: 'truecolor' },
        isTTY: true,
      }),
    ).toBe(0)
  })

  it('honors NO_COLOR', () => {
    expect(detectColorDepth({ env: { NO_COLOR: '1' }, isTTY: true })).toBe(0)
  })

  it('treats empty NO_COLOR as not set', () => {
    expect(
      detectColorDepth({
        env: { NO_COLOR: '', COLORTERM: 'truecolor' },
        isTTY: true,
      }),
    ).toBe(24)
  })

  it('FORCE_COLOR=0 disables', () => {
    expect(
      detectColorDepth({ env: { FORCE_COLOR: '0', COLORTERM: 'truecolor' }, isTTY: true }),
    ).toBe(0)
  })

  it('FORCE_COLOR=1 → 4', () => {
    expect(detectColorDepth({ env: { FORCE_COLOR: '1' }, isTTY: false })).toBe(4)
  })

  it('FORCE_COLOR=2 → 8', () => {
    expect(detectColorDepth({ env: { FORCE_COLOR: '2' }, isTTY: false })).toBe(8)
  })

  it('FORCE_COLOR=3 → 24', () => {
    expect(detectColorDepth({ env: { FORCE_COLOR: '3' }, isTTY: false })).toBe(24)
  })

  it('non-TTY → 0 unless forced', () => {
    expect(
      detectColorDepth({ env: { COLORTERM: 'truecolor' }, isTTY: false, platform: 'linux' }),
    ).toBe(0)
  })

  it('COLORTERM=truecolor → 24', () => {
    expect(detectColorDepth({ env: { COLORTERM: 'truecolor' }, isTTY: true })).toBe(24)
  })

  it('TERM=xterm-256color → 8', () => {
    expect(detectColorDepth({ env: { TERM: 'xterm-256color' }, isTTY: true })).toBe(8)
  })

  it('TERM=xterm → 4', () => {
    expect(detectColorDepth({ env: { TERM: 'xterm' }, isTTY: true })).toBe(4)
  })

  it('win32 modern → 24', () => {
    expect(detectColorDepth({ env: {}, isTTY: true, platform: 'win32' })).toBe(24)
  })
})

describe('detectUnicode', () => {
  it('honors CLIKIT_DETERMINISTIC=1', () => {
    expect(detectUnicode({ env: { CLIKIT_DETERMINISTIC: '1', LANG: 'en_US.UTF-8' } })).toBe(false)
  })

  it('detects UTF-8 from LANG', () => {
    expect(detectUnicode({ env: { LANG: 'en_US.UTF-8' } })).toBe(true)
  })

  it('detects UTF-8 from LC_CTYPE', () => {
    expect(detectUnicode({ env: { LC_CTYPE: 'C.UTF-8' } })).toBe(true)
  })

  it('defaults true on win32', () => {
    expect(detectUnicode({ env: {}, platform: 'win32' })).toBe(true)
  })
})

describe('detectCursorMoves', () => {
  it('true on Node TTY', () => {
    expect(detectCursorMoves({ env: {}, isTTY: true, platform: 'linux' })).toBe(true)
  })
  it('false on non-TTY', () => {
    expect(detectCursorMoves({ env: {}, isTTY: false, platform: 'linux' })).toBe(false)
  })
  it('false in browser even when isTTY claims true', () => {
    expect(detectCursorMoves({ env: {}, isTTY: true, platform: 'browser' })).toBe(false)
  })
  it('false under CLIKIT_DETERMINISTIC', () => {
    expect(
      detectCursorMoves({ env: { CLIKIT_DETERMINISTIC: '1' }, isTTY: true, platform: 'linux' }),
    ).toBe(false)
  })
})

describe('detectHyperlinks', () => {
  it('false by default', () => {
    expect(detectHyperlinks({ env: {} })).toBe(false)
  })
  it('true for iTerm.app', () => {
    expect(detectHyperlinks({ env: { TERM_PROGRAM: 'iTerm.app' } })).toBe(true)
  })
  it('true for vscode', () => {
    expect(detectHyperlinks({ env: { TERM_PROGRAM: 'vscode' } })).toBe(true)
  })
  it('FORCE_HYPERLINKS wins', () => {
    expect(detectHyperlinks({ env: { FORCE_HYPERLINKS: '1' } })).toBe(true)
  })
  it('NO_HYPERLINKS suppresses TERM_PROGRAM', () => {
    expect(detectHyperlinks({ env: { NO_HYPERLINKS: '1', TERM_PROGRAM: 'iTerm.app' } })).toBe(false)
  })
})
