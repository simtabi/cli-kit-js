/**
 * Numeric input prompt.
 *
 *   ? Port? › 3000█
 *
 *   - Accepts digits, optional leading `-`, optional `.` (unless `integer`).
 *   - Up/Down arrow keys increment / decrement by `step`.
 *   - On Enter: validates `min`/`max`/`integer`, then user `validate`.
 *
 * Non-TTY fallback: writes the message, reads one line, parses.
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import {
  glyphs,
  isBackspaceKey,
  isCancelKey,
  isEnterKey,
  isPrintable,
  throwIfAborted,
} from './render'
import { createPromptRenderer } from './renderer'
import { type NumberPromptOptions, PromptCancelledError } from './types'

export async function number(opts: NumberPromptOptions): Promise<number> {
  const { io, message, signal, validate } = opts
  const step = opts.step ?? 1
  const integer = opts.integer === true
  const min = opts.min
  const max = opts.max
  throwIfAborted(signal)
  const g = glyphs(io)

  if (!io.isTTY) {
    io.write(`${message} `)
    const line = (await io.readLine(signal ?? new AbortController().signal)).trim()
    const value = line.length > 0 ? parseNumber(line, integer) : (opts.default ?? Number.NaN)
    const builtIn = validateBounds(value, { min, max, integer })
    if (builtIn !== true) {
      io.writeError(`${g.cross} ${builtIn}\n`)
      throw new Error(builtIn)
    }
    if (validate) {
      const r = validate(value)
      if (r !== true) {
        io.writeError(`${g.cross} ${r}\n`)
        throw new Error(r)
      }
    }
    return value
  }

  let buffer = opts.default !== undefined ? formatNumber(opts.default, integer) : ''
  let error: string | null = null
  const sig = signal ?? new AbortController().signal
  const renderer = createPromptRenderer(io)

  const render = (): number => {
    io.writeRaw(`${g.q} ${message} ${g.arrow} ${buffer || colors.gray('0')}`)
    if (error) {
      io.writeRaw(`\n${colors.red(`  ${error}`)}`)
      return 2
    }
    return 1
  }

  renderer.paint(render)

  try {
    while (true) {
      const key = await io.readKey(sig)
      if (isCancelKey(key)) {
        renderer.end()
        io.writeRaw('\n')
        throw new PromptCancelledError()
      }
      if (isEnterKey(key)) {
        const value = buffer.length > 0 ? parseNumber(buffer, integer) : (opts.default ?? Number.NaN)
        const bounds = validateBounds(value, { min, max, integer })
        if (bounds !== true) {
          error = bounds
          renderer.paint(render)
          continue
        }
        if (validate) {
          const r = validate(value)
          if (r !== true) {
            error = r
            renderer.paint(render)
            continue
          }
        }
        error = null
        renderer.paint(render)
        renderer.end()
        io.writeRaw('\n')
        return value
      }
      if (key.name === 'up') {
        const current = buffer.length > 0 ? parseNumber(buffer, integer) : (opts.default ?? 0)
        const next = clamp(safeAdd(current, step), min, max)
        buffer = formatNumber(next, integer)
        error = null
        renderer.paint(render)
        continue
      }
      if (key.name === 'down') {
        const current = buffer.length > 0 ? parseNumber(buffer, integer) : (opts.default ?? 0)
        const next = clamp(safeAdd(current, -step), min, max)
        buffer = formatNumber(next, integer)
        error = null
        renderer.paint(render)
        continue
      }
      if (isBackspaceKey(key)) {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1)
          error = null
        }
        renderer.paint(render)
        continue
      }
      if (isPrintable(key) && isNumericChar(key.raw, buffer, integer)) {
        buffer += key.raw
        error = null
        renderer.paint(render)
      }
    }
  } catch (err) {
    renderer.end()
    throw err
  }
}

function parseNumber(s: string, integer: boolean): number {
  if (s === '-' || s === '.' || s === '') return Number.NaN
  const n = integer ? Number.parseInt(s, 10) : Number.parseFloat(s)
  return n
}

function formatNumber(n: number, integer: boolean): string {
  if (!Number.isFinite(n)) return ''
  if (integer) return String(Math.trunc(n))
  return String(n)
}

function safeAdd(a: number, b: number): number {
  if (!Number.isFinite(a)) return b
  return a + b
}

function clamp(n: number, min: number | undefined, max: number | undefined): number {
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}

function isNumericChar(ch: string, buffer: string, integer: boolean): boolean {
  if (ch.length !== 1) return false
  if (ch >= '0' && ch <= '9') return true
  if (ch === '-' && buffer.length === 0) return true
  if (ch === '.' && !integer && !buffer.includes('.')) return true
  return false
}

function validateBounds(
  n: number,
  bounds: {
    readonly min: number | undefined
    readonly max: number | undefined
    readonly integer: boolean
  },
): true | string {
  if (!Number.isFinite(n)) return 'not a number'
  if (bounds.integer && !Number.isInteger(n)) return 'must be an integer'
  if (bounds.min !== undefined && n < bounds.min) return `must be ≥ ${bounds.min}`
  if (bounds.max !== undefined && n > bounds.max) return `must be ≤ ${bounds.max}`
  return true
}
