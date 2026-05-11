/**
 * @vitest-environment jsdom
 */

import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createDomAdapter } from '../src/dom'

function mount(): HTMLDivElement {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return div
}

describe('DomAdapter: write semantics', () => {
  it('plain text becomes a text node', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('hello')
    expect(el.childNodes.length).toBe(1)
    expect(el.firstChild?.nodeType).toBe(Node.TEXT_NODE)
    expect(el.textContent).toBe('hello')
  })

  it('SGR-styled text becomes a styled <span>', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('\x1b[31mred\x1b[39m')
    const span = el.firstChild as HTMLElement
    expect(span.tagName).toBe('SPAN')
    expect(span.getAttribute('style')).toContain('color: red')
    expect(span.textContent).toBe('red')
  })

  it('writeError tags spans with data-stream="stderr"', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.writeError('boom')
    const span = el.firstChild as HTMLElement
    expect(span.getAttribute('data-stream')).toBe('stderr')
  })

  it('clear empties the mount', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('hi')
    io.clear()
    expect(el.childNodes.length).toBe(0)
  })

  it('CSS selector mount works', () => {
    const el = mount()
    el.id = 'play'
    const io = createDomAdapter({ mount: '#play' })
    io.write('x')
    expect(el.textContent).toBe('x')
  })
})

describe('DomAdapter: XSS safety', () => {
  it('script tags in user input are inert text', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('<script>alert("x")</script>')
    expect(el.querySelector('script')).toBeNull()
    expect(el.textContent).toBe('<script>alert("x")</script>')
  })

  it('event-handler attribute syntax in input is inert text', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('onerror="alert(1)"')
    expect(el.querySelector('[onerror]')).toBeNull()
    expect(el.textContent).toBe('onerror="alert(1)"')
  })

  it('OSC (clipboard hijack) is stripped before reaching DOM', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('safe\x1b]52;c;data\x1b\\done')
    expect(el.textContent).toBe('safedone')
  })

  it('only style attribute appears on spans (no unexpected attrs)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (s) => {
        const el = mount()
        const io = createDomAdapter({ mount: el })
        io.write(s)
        for (const node of Array.from(el.querySelectorAll('span'))) {
          for (const attr of Array.from(node.attributes)) {
            expect(['style', 'data-stream'].includes(attr.name)).toBe(true)
          }
        }
      }),
      { numRuns: 100 },
    )
  })
})

describe('DomAdapter: keyboard', () => {
  it('readKey resolves on a keydown event', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const ac = new AbortController()
    const p = io.readKey(ac.signal)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    const k = await p
    expect(k.name).toBe('a')
  })

  it('readKey normalises arrow keys', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const ac = new AbortController()
    const p = io.readKey(ac.signal)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect((await p).name).toBe('up')
  })

  it('readLine buffers until Enter', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const ac = new AbortController()
    const p = io.readLine(ac.signal)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(await p).toBe('hi')
  })

  it('abort rejects pending reads', async () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const ac = new AbortController()
    const p = io.readKey(ac.signal)
    ac.abort()
    await expect(p).rejects.toThrow('aborted')
  })
})
