/**
 * Browser DevTools console IOAdapter.
 *
 * Translates ANSI SGR runs into the `%c` CSS format strings used by
 * Chrome / Firefox / Safari DevTools `console.log`. Non-SGR escapes are
 * stripped first via @simtabi/cli-kit-js-ansi's sanitise.
 *
 * Limitations:
 *   - Each `console.log` call emits one line per `write`. No in-place
 *     redraw — DevTools doesn't expose cursor primitives.
 *   - `readKey` / `readLine` are not supported (DevTools is non-interactive).
 *     Consumers that need prompts should use the DOM adapter instead.
 */

import { sanitize, type Capabilities } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter, KeyEvent, ResizeListener } from './types'

class AbortError extends Error {
  override readonly name = 'AbortError'
  constructor() {
    super('aborted')
  }
}

interface StyleState {
  fg?: string
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

const FG: Readonly<Record<number, string>> = {
  30: 'black',
  31: '#cc0000',
  32: '#4e9a06',
  33: '#c4a000',
  34: '#3465a4',
  35: '#75507b',
  36: '#06989a',
  37: '#d3d7cf',
  90: '#555753',
  91: '#ef2929',
  92: '#8ae234',
  93: '#fce94f',
  94: '#729fcf',
  95: '#ad7fa8',
  96: '#34e2e2',
  97: '#eeeeec',
}
const BG: Readonly<Record<number, string>> = {
  40: 'black',
  41: '#cc0000',
  42: '#4e9a06',
  43: '#c4a000',
  44: '#3465a4',
  45: '#75507b',
  46: '#06989a',
  47: '#d3d7cf',
  100: '#555753',
  101: '#ef2929',
  102: '#8ae234',
  103: '#fce94f',
  104: '#729fcf',
  105: '#ad7fa8',
  106: '#34e2e2',
  107: '#eeeeec',
}

function applyCodes(state: StyleState, codes: readonly number[]): StyleState {
  const next: StyleState = { ...state }
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i] ?? 0
    if (c === 0) {
      for (const k of Object.keys(next)) delete next[k as keyof StyleState]
      continue
    }
    if (c === 1) {
      next.bold = true
      continue
    }
    if (c === 3) {
      next.italic = true
      continue
    }
    if (c === 4) {
      next.underline = true
      continue
    }
    if (c === 22) {
      delete next.bold
      continue
    }
    if (c === 23) {
      delete next.italic
      continue
    }
    if (c === 24) {
      delete next.underline
      continue
    }
    if (c === 39) {
      delete next.fg
      continue
    }
    if (c === 49) {
      delete next.bg
      continue
    }
    if (c in FG) {
      next.fg = FG[c]
      continue
    }
    if (c in BG) {
      next.bg = BG[c]
      continue
    }
    if (c === 38 || c === 48) {
      const isBg = c === 48
      const mode = codes[i + 1]
      if (mode === 2) {
        const r = clamp(codes[i + 2] ?? 0)
        const g = clamp(codes[i + 3] ?? 0)
        const b = clamp(codes[i + 4] ?? 0)
        const col = `rgb(${r}, ${g}, ${b})`
        if (isBg) next.bg = col
        else next.fg = col
        i += 4
      } else if (mode === 5) {
        i += 2
      }
    }
  }
  return next
}

function clamp(n: number): number {
  if (n < 0) return 0
  if (n > 255) return 255
  return Math.floor(n)
}

function stateToCss(state: StyleState): string {
  const parts: string[] = []
  if (state.fg) parts.push(`color: ${state.fg}`)
  if (state.bg) parts.push(`background-color: ${state.bg}`)
  if (state.bold) parts.push('font-weight: bold')
  if (state.italic) parts.push('font-style: italic')
  if (state.underline) parts.push('text-decoration: underline')
  return parts.join('; ')
}

/**
 * Convert an ANSI-styled string into a `[format, ...args]` tuple suitable
 * for `console.log.apply(console, …)`.
 */
export function toConsoleArgs(input: string): [string, ...string[]] {
  const cleaned = sanitize(input)
  const SGR = /\x1b\[([0-9;]*)m/g
  let cursor = 0
  let state: StyleState = {}
  let format = ''
  const css: string[] = []
  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: regex walk
  while ((match = SGR.exec(cleaned)) !== null) {
    if (match.index > cursor) {
      format += `%c${cleaned.slice(cursor, match.index)}`
      css.push(stateToCss(state))
    }
    const codeStr = match[1] ?? ''
    state = applyCodes(state, codeStr === '' ? [0] : codeStr.split(';').map((p) => Number(p) | 0))
    cursor = SGR.lastIndex
  }
  if (cursor < cleaned.length) {
    format += `%c${cleaned.slice(cursor)}`
    css.push(stateToCss(state))
  }
  if (css.length === 0) return [cleaned]
  return [format, ...css]
}

export interface ConsoleAdapterOptions {
  /** Override the underlying console (for tests). */
  readonly console?: Console
  readonly columns?: number
  readonly rows?: number
  readonly capabilities?: Partial<Capabilities>
}

class ConsoleAdapter implements IOAdapter {
  readonly #console: Console
  readonly #columns: number
  readonly #rows: number
  readonly #capabilities: Capabilities
  // Pending writes that haven't been flushed by a newline.
  #stdoutBuffer = ''
  #stderrBuffer = ''

  constructor(opts: ConsoleAdapterOptions = {}) {
    this.#console = opts.console ?? globalThis.console
    this.#columns = opts.columns ?? 80
    this.#rows = opts.rows ?? 24
    this.#capabilities = {
      color: opts.capabilities?.color ?? 24,
      unicode: opts.capabilities?.unicode ?? true,
      hyperlinks: opts.capabilities?.hyperlinks ?? false,
      stream: 'stdout',
    }
  }

  write(chunk: string): void {
    this.#stdoutBuffer += chunk
    this.#flush('stdout')
  }

  writeError(chunk: string): void {
    this.#stderrBuffer += chunk
    this.#flush('stderr')
  }

  writeRaw(chunk: string): void {
    // DevTools doesn't honour cursor moves; treat raw the same as write.
    this.write(chunk)
  }

  clear(): void {
    this.#console.clear?.()
  }

  get columns(): number {
    return this.#columns
  }

  get rows(): number {
    return this.#rows
  }

  get isTTY(): boolean {
    return false
  }

  get isPiped(): boolean {
    return true
  }

  get capabilities(): Capabilities {
    return this.#capabilities
  }

  get stdin(): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(c) {
        c.close()
      },
    })
  }

  onResize(_listener: ResizeListener): () => void {
    return () => undefined
  }

  async readKey(_signal: AbortSignal): Promise<KeyEvent> {
    throw new Error('ConsoleAdapter: readKey is not supported; use the DOM adapter for prompts')
  }

  async readLine(_signal: AbortSignal): Promise<string> {
    throw new Error('ConsoleAdapter: readLine is not supported; use the DOM adapter for prompts')
  }

  #flush(stream: 'stdout' | 'stderr'): void {
    const ref = stream === 'stdout' ? '#stdoutBuffer' : '#stderrBuffer'
    let buf = stream === 'stdout' ? this.#stdoutBuffer : this.#stderrBuffer
    let nl = buf.indexOf('\n')
    while (nl !== -1) {
      const line = buf.slice(0, nl)
      const args = toConsoleArgs(line)
      if (stream === 'stdout') {
        this.#console.log(...args)
      } else {
        this.#console.error(...args)
      }
      buf = buf.slice(nl + 1)
      nl = buf.indexOf('\n')
    }
    if (stream === 'stdout') this.#stdoutBuffer = buf
    else this.#stderrBuffer = buf
    // Reference to silence unused-var lint if needed
    void ref
  }
}

export function createConsoleAdapter(opts: ConsoleAdapterOptions = {}): IOAdapter {
  return new ConsoleAdapter(opts)
}
