/**
 * @vitest-environment jsdom
 *
 * Verifies OutputRegion semantics:
 *   - DomAdapter.beginRegion() returns a clearable sub-mount
 *   - MemoryAdapter.beginRegion() truncates stdout back to region start
 *   - Writes outside an active region are unaffected by region.clear()
 */

import { describe, expect, it } from 'vitest'
import { createDomAdapter } from '../src/dom'
import { MemoryAdapter } from '../src/memory'

function mount(): HTMLDivElement {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return div
}

describe('DomAdapter: beginRegion', () => {
  it('writes go into the region and clear wipes only the region', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('before')
    const region = io.beginRegion?.()
    expect(region).toBeDefined()
    io.write('inside')
    expect(el.textContent).toBe('beforeinside')
    region?.clear()
    expect(el.textContent).toBe('before')
  })

  it('end pops the region so subsequent writes go to the root', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const region = io.beginRegion?.()
    io.write('inside')
    region?.end()
    io.write('after')
    expect(el.textContent).toBe('insideafter')
  })

  it('nested regions: clear only affects the innermost', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    io.write('a')
    const outer = io.beginRegion?.()
    io.write('b')
    const inner = io.beginRegion?.()
    io.write('c')
    inner?.clear()
    expect(el.textContent).toBe('ab')
    outer?.clear()
    expect(el.textContent).toBe('a')
  })

  it('clear() at the root drops every region', () => {
    const el = mount()
    const io = createDomAdapter({ mount: el })
    const r1 = io.beginRegion?.()
    io.write('x')
    io.clear()
    expect(el.textContent).toBe('')
    // After root clear, opening a fresh region works.
    r1?.end()
    const r2 = io.beginRegion?.()
    io.write('y')
    expect(el.textContent).toBe('y')
    r2?.end()
  })
})

describe('MemoryAdapter: beginRegion', () => {
  it('clear truncates stdout to region start', () => {
    const io = new MemoryAdapter({ isTTY: false, cursorMoves: false })
    io.write('keep ')
    const r = io.beginRegion?.()
    io.write('drop')
    expect(io.stdout).toBe('keep drop')
    r?.clear()
    expect(io.stdout).toBe('keep ')
    r?.end()
  })

  it('rawWrites tracked the same way', () => {
    const io = new MemoryAdapter({ isTTY: false, cursorMoves: false })
    io.writeRaw('keep')
    const r = io.beginRegion?.()
    io.writeRaw('drop')
    expect(io.rawWrites.length).toBe(2)
    r?.clear()
    expect(io.rawWrites.length).toBe(1)
    expect(io.rawWrites[0]).toBe('keep')
    r?.end()
  })

  it('end is idempotent', () => {
    const io = new MemoryAdapter({ isTTY: false, cursorMoves: false })
    const r = io.beginRegion?.()
    r?.end()
    r?.end()
    // No throws.
  })
})
