import { MemoryAdapter, answer } from '@simtabi/cli-kit-js-testing'
import { describe, expect, it } from 'vitest'
import { form } from '../src/index'

function tty(): MemoryAdapter {
  return new MemoryAdapter({ isTTY: true, color: 24 })
}

describe('form prompt', () => {
  it('collects text + number + confirm in order', async () => {
    const io = tty()
    answer(
      io,
      // text: "hi"
      { name: 'h', raw: 'h' },
      { name: 'i', raw: 'i' },
      'enter',
      // number: 7
      { name: '7', raw: '7' },
      'enter',
      // confirm: y
      { name: 'y', raw: 'y' },
    )
    const result = await form({
      io,
      fields: [
        { name: 'greet', kind: 'text', message: 'Greet?' },
        { name: 'count', kind: 'number', message: 'Count?' },
        { name: 'go', kind: 'confirm', message: 'Go?' },
      ],
    })
    expect(result.greet).toBe('hi')
    expect(result.count).toBe(7)
    expect(result.go).toBe(true)
  })

  it('select + multiselect work via form', async () => {
    const io = tty()
    answer(
      io,
      // select: pick b
      { name: 'down' },
      'enter',
      // multiselect: toggle 1st + 3rd
      'space',
      { name: 'down' },
      { name: 'down' },
      'space',
      'enter',
    )
    const result = await form({
      io,
      fields: [
        {
          name: 'env',
          kind: 'select',
          message: 'Env?',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
        {
          name: 'feats',
          kind: 'multiselect',
          message: 'Feats?',
          options: [
            { value: 'x', label: 'X' },
            { value: 'y', label: 'Y' },
            { value: 'z', label: 'Z' },
          ],
        },
      ],
    })
    expect(result.env).toBe('b')
    expect(result.feats).toEqual(['x', 'z'])
  })

  it('cross-field validate throws', async () => {
    const io = tty()
    answer(io, { name: '5', raw: '5' }, 'enter', { name: '3', raw: '3' }, 'enter')
    await expect(
      form({
        io,
        fields: [
          { name: 'a', kind: 'number', message: 'A?' },
          { name: 'b', kind: 'number', message: 'B?' },
        ],
        validate: (r) =>
          (r as { a: number; b: number }).a > (r as { a: number; b: number }).b
            ? true
            : 'a must exceed b',
      }),
    ).resolves.toBeDefined()
  })

  it('empty fields rejected', async () => {
    const io = tty()
    await expect(form({ io, fields: [] })).rejects.toThrow(/at least one field/)
  })
})
