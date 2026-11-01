/**
 * @vitest-environment jsdom
 *
 * Browser-interactive prompts (Phase 3). Verifies select / multiselect / text
 * actually function when driven by `IOAdapter.beginRegion()` (cursorMoves=false)
 * — i.e. no ANSI escape sequences leak into the DOM and keyboard events
 * advance the prompt to a finished value.
 *
 * IMPORTANT: each dispatched keystroke must be followed by a microtask drain
 * (`await tick()`) so the prompt's `await io.readKey()` continuation runs and
 * re-registers a new pending key. Without that, subsequent keys fall through
 * to the readLine buffer and are lost.
 */

import { createDomAdapter } from '@simtabi/cli-kit-js-io/dom'
import { describe, expect, it } from 'vitest'
import { multiselect, select, text } from '../src/index'

function mount(): HTMLDivElement {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return div
}

function dispatch(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('DOM prompts: select', () => {
  it('renders, navigates with ArrowDown, picks with Enter', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const p = select({
      io,
      message: 'Pick:',
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ],
    })
    await tick()
    expect(el.textContent).toContain('Alpha')
    expect(el.textContent).toContain('Beta')

    dispatch('ArrowDown')
    await tick()
    dispatch('Enter')
    expect(await p).toBe('b')
  })

  it('repaint clears prior frame, never leaks ANSI codes', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const p = select({
      io,
      message: 'M:',
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
      ],
    })
    await tick()
    dispatch('ArrowDown')
    await tick()
    dispatch('ArrowUp')
    await tick()
    dispatch('Enter')
    await p
    expect(el.textContent).not.toMatch(/\x1b/)
    expect(el.textContent).not.toMatch(/\[\d+A/)
  })
})

describe('DOM prompts: multiselect', () => {
  it('Space toggles, Enter submits', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const p = multiselect({
      io,
      message: 'Pick many:',
      options: [
        { value: 'x', label: 'X' },
        { value: 'y', label: 'Y' },
        { value: 'z', label: 'Z' },
      ],
    })
    await tick()
    dispatch(' ')
    await tick()
    dispatch('ArrowDown')
    await tick()
    dispatch('ArrowDown')
    await tick()
    dispatch(' ')
    await tick()
    dispatch('Enter')
    expect(await p).toEqual(['x', 'z'])
  })
})

describe('DOM prompts: text', () => {
  it('printable keys append, Enter accepts', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const p = text({ io, message: 'Name?' })
    await tick()
    dispatch('h')
    await tick()
    dispatch('i')
    await tick()
    dispatch('Enter')
    expect(await p).toBe('hi')
  })

  it('Backspace removes the last char', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const p = text({ io, message: 'Name?' })
    await tick()
    dispatch('a')
    await tick()
    dispatch('b')
    await tick()
    dispatch('Backspace')
    await tick()
    dispatch('Enter')
    expect(await p).toBe('a')
  })
})
