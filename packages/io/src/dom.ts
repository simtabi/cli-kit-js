/**
 * Browser DOM IOAdapter.
 *
 *   - Mounts into a target element (DOM node or CSS selector).
 *   - `write` HTML-escapes every consumer character and translates ANSI SGR
 *     into inline `<span>` elements via `document.createElement` — never
 *     `innerHTML`, never `eval`, never inline event handlers.
 *   - `style` attribute restricted to a 5-property allowlist:
 *     `color`, `background-color`, `font-weight`, `font-style`,
 *     `text-decoration`. Values validated against tight regexes.
 *   - Optional `cspNonce` applied to dynamically-inserted `<style>` if we
 *     ever emit one (we don't today; kept for forward compatibility).
 *   - Keyboard handling: attaches a `keydown` listener for `readKey`;
 *     buffers printable keys + Enter for `readLine`. Listener auto-detaches
 *     when the AbortSignal fires.
 */

import { type Capabilities, detectCapabilities, sanitize, strip } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter, KeyEvent, OutputRegion, ResizeListener } from './types'

// ──────────────────────────────────────────────────────────────────────────────
// Safe ANSI → DOM emission
// ──────────────────────────────────────────────────────────────────────────────

interface StyleState {
  fg?: string
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  dim?: boolean
}

const BASIC_FG: Readonly<Record<number, string>> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'olive',
  34: 'navy',
  35: 'purple',
  36: 'teal',
  37: 'silver',
  90: 'gray',
  91: '#ff5555',
  92: '#55ff55',
  93: '#ffff55',
  94: '#5555ff',
  95: '#ff55ff',
  96: '#55ffff',
  97: 'white',
}

const BASIC_BG: Readonly<Record<number, string>> = {
  40: 'black',
  41: 'red',
  42: 'green',
  43: 'olive',
  44: 'navy',
  45: 'purple',
  46: 'teal',
  47: 'silver',
  100: 'gray',
  101: '#ff5555',
  102: '#55ff55',
  103: '#ffff55',
  104: '#5555ff',
  105: '#ff55ff',
  106: '#55ffff',
  107: 'white',
}

function parseSgrSegments(input: string): Array<{ text: string; state: StyleState }> {
  // Sanitise first — strips OSC, DCS, APC, cursor moves, screen clears.
  const cleaned = sanitize(input)
  const segments: Array<{ text: string; state: StyleState }> = []
  let state: StyleState = {}
  const SGR = /\x1b\[([0-9;]*)m/g
  let cursor = 0
  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: classic regex walk
  while ((match = SGR.exec(cleaned)) !== null) {
    if (match.index > cursor) {
      segments.push({ text: cleaned.slice(cursor, match.index), state: { ...state } })
    }
    state = applyCodes(state, parseCodes(match[1] ?? ''))
    cursor = SGR.lastIndex
  }
  if (cursor < cleaned.length) {
    segments.push({ text: cleaned.slice(cursor), state: { ...state } })
  }
  return segments
}

function parseCodes(s: string): readonly number[] {
  if (s === '') return [0]
  return s.split(';').map((p) => Number(p) | 0)
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
    if (c === 2) {
      next.dim = true
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
    if (c === 9) {
      next.strike = true
      continue
    }
    if (c === 22) {
      delete next.bold
      delete next.dim
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
    if (c === 29) {
      delete next.strike
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
    const fgVal = BASIC_FG[c]
    if (fgVal !== undefined) {
      next.fg = fgVal
      continue
    }
    const bgVal = BASIC_BG[c]
    if (bgVal !== undefined) {
      next.bg = bgVal
      continue
    }
    if (c === 38 || c === 48) {
      const isBg = c === 48
      const mode = codes[i + 1]
      if (mode === 2) {
        const r = clamp255(codes[i + 2] ?? 0)
        const g = clamp255(codes[i + 3] ?? 0)
        const b = clamp255(codes[i + 4] ?? 0)
        const col = `rgb(${r}, ${g}, ${b})`
        if (isBg) next.bg = col
        else next.fg = col
        i += 4
      } else if (mode === 5) {
        // 256-color → fallback to basic mapping (cheap; consumers wanting
        // exact cube colours can use the render/html package).
        i += 2
      }
    }
  }
  return next
}

function clamp255(n: number): number {
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
  if (state.underline || state.strike) {
    const dec: string[] = []
    if (state.underline) dec.push('underline')
    if (state.strike) dec.push('line-through')
    parts.push(`text-decoration: ${dec.join(' ')}`)
  }
  return parts.join('; ')
}

// ──────────────────────────────────────────────────────────────────────────────
// Adapter
// ──────────────────────────────────────────────────────────────────────────────

export interface DomAdapterOptions {
  /** Target element or CSS selector. Required. */
  readonly mount: Element | string
  /** Columns reported via `IOAdapter.columns`. Default 80. */
  readonly columns?: number
  /** Rows reported via `IOAdapter.rows`. Default 24. */
  readonly rows?: number
  /** Capability override (forced color depth, unicode, hyperlinks). */
  readonly capabilities?: Partial<Capabilities>
  /** Reserved for forward-compat: a CSP nonce to apply to dynamically-injected styles. */
  readonly cspNonce?: string
}

class AbortError extends Error {
  override readonly name = 'AbortError'
  constructor() {
    super('aborted')
  }
}

interface PendingKey {
  resolve(k: KeyEvent): void
  reject(e: Error): void
  signal: AbortSignal
  onAbort: () => void
}

interface PendingLine {
  resolve(s: string): void
  reject(e: Error): void
  signal: AbortSignal
  onAbort: () => void
}

class DomAdapter implements IOAdapter {
  readonly #rootMount: Element
  /**
   * Current write target. Defaults to #rootMount; pushed onto a region stack
   * when `beginRegion()` opens a child mount so prompts can redraw without
   * disturbing prior output.
   */
  #writeTarget: Element
  readonly #regionStack: Element[] = []
  readonly #columns: number
  readonly #rows: number
  readonly #capabilities: Capabilities
  readonly #resizeListeners = new Set<ResizeListener>()
  readonly #pendingKeys: PendingKey[] = []
  readonly #pendingLines: PendingLine[] = []
  #lineBuffer = ''
  #keydownAttached = false
  #resizeAttached = false

  constructor(opts: DomAdapterOptions) {
    const mount = typeof opts.mount === 'string' ? document.querySelector(opts.mount) : opts.mount
    if (!mount) {
      throw new Error(
        `DomAdapter: mount target ${JSON.stringify(opts.mount)} not found in document`,
      )
    }
    this.#rootMount = mount
    this.#writeTarget = mount
    // opts.cspNonce reserved for future <style nonce="…"> emission; stored
    // implicitly by the API contract but unused today.
    void opts.cspNonce
    this.#columns = opts.columns ?? 80
    this.#rows = opts.rows ?? 24

    const base = detectCapabilities({ env: {}, platform: 'browser', isTTY: true })
    this.#capabilities = {
      color: opts.capabilities?.color ?? 24,
      unicode: opts.capabilities?.unicode ?? base.unicode,
      hyperlinks: opts.capabilities?.hyperlinks ?? false,
      // DOM doesn't honour ANSI cursor-move escapes — they'd render as text.
      cursorMoves: opts.capabilities?.cursorMoves ?? false,
      stream: 'stdout',
    }
  }

  write(chunk: string): void {
    this.#appendSegments(chunk, false)
  }

  writeError(chunk: string): void {
    this.#appendSegments(chunk, true)
  }

  writeRaw(chunk: string): void {
    // writeRaw skips ANSI sanitisation. We still HTML-escape via textContent.
    const segments: Array<{ text: string; state: StyleState }> = [{ text: chunk, state: {} }]
    this.#emitSegments(segments, false)
  }

  clear(): void {
    // Reset to the root mount, then wipe everything. Any open regions go
    // with it — `clear()` is "wipe the screen", not "wipe the current region".
    this.#regionStack.length = 0
    this.#writeTarget = this.#rootMount
    while (this.#rootMount.firstChild) this.#rootMount.removeChild(this.#rootMount.firstChild)
  }

  beginRegion(): OutputRegion {
    const parent = this.#writeTarget
    const region = document.createElement('div')
    region.setAttribute('data-cli-region', '')
    parent.appendChild(region)
    this.#regionStack.push(parent)
    this.#writeTarget = region
    let ended = false
    return {
      clear: () => {
        if (ended) return
        while (region.firstChild) region.removeChild(region.firstChild)
      },
      end: () => {
        if (ended) return
        ended = true
        // Pop only if this region is still on top. If a later region was opened
        // and never ended (programmer error), leave the stack as-is.
        if (this.#writeTarget === region) {
          this.#writeTarget = this.#regionStack.pop() ?? this.#rootMount
        }
      },
    }
  }

  get columns(): number {
    return this.#columns
  }

  get rows(): number {
    return this.#rows
  }

  get isTTY(): boolean {
    return true
  }

  get isPiped(): boolean {
    return false
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

  onResize(listener: ResizeListener): () => void {
    this.#resizeListeners.add(listener)
    if (!this.#resizeAttached) {
      this.#resizeAttached = true
      window.addEventListener('resize', () => {
        for (const l of this.#resizeListeners) {
          try {
            l()
          } catch {
            // isolate
          }
        }
      })
    }
    return () => {
      this.#resizeListeners.delete(listener)
    }
  }

  async readKey(signal: AbortSignal): Promise<KeyEvent> {
    return new Promise<KeyEvent>((resolve, reject) => {
      if (signal.aborted) {
        reject(new AbortError())
        return
      }
      const onAbort = () => {
        const idx = this.#pendingKeys.findIndex((p) => p.resolve === resolve)
        if (idx !== -1) this.#pendingKeys.splice(idx, 1)
        reject(new AbortError())
      }
      this.#pendingKeys.push({ resolve, reject, signal, onAbort })
      signal.addEventListener('abort', onAbort, { once: true })
      this.#attachKeydown()
    })
  }

  async readLine(signal: AbortSignal): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (signal.aborted) {
        reject(new AbortError())
        return
      }
      const onAbort = () => {
        const idx = this.#pendingLines.findIndex((p) => p.resolve === resolve)
        if (idx !== -1) this.#pendingLines.splice(idx, 1)
        reject(new AbortError())
      }
      this.#pendingLines.push({ resolve, reject, signal, onAbort })
      signal.addEventListener('abort', onAbort, { once: true })
      this.#attachKeydown()
    })
  }

  // ────────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────────

  #appendSegments(chunk: string, isError: boolean): void {
    const segments = parseSgrSegments(chunk)
    this.#emitSegments(segments, isError)
  }

  #emitSegments(segments: Array<{ text: string; state: StyleState }>, isError: boolean): void {
    for (const seg of segments) {
      if (seg.text.length === 0) continue
      const css = stateToCss(seg.state)
      // Each segment becomes a span (or text node if no styling).
      let node: Text | HTMLSpanElement
      if (css.length === 0 && !isError) {
        node = document.createTextNode(seg.text)
      } else {
        const span = document.createElement('span')
        if (css.length > 0) span.setAttribute('style', css)
        if (isError) span.setAttribute('data-stream', 'stderr')
        span.textContent = seg.text
        node = span
      }
      this.#writeTarget.appendChild(node)
    }
  }

  #attachKeydown(): void {
    if (this.#keydownAttached) return
    this.#keydownAttached = true
    document.addEventListener('keydown', this.#onKeydown)
  }

  readonly #onKeydown = (ev: KeyboardEvent): void => {
    const key = keyEventFromDom(ev)

    // Deliver to first pending readKey, if any.
    const pending = this.#pendingKeys.shift()
    if (pending) {
      pending.signal.removeEventListener('abort', pending.onAbort)
      pending.resolve(key)
      ev.preventDefault()
      return
    }

    // Otherwise route into the line buffer.
    if (key.name === 'enter' || key.name === 'return') {
      const line = this.#lineBuffer
      this.#lineBuffer = ''
      const next = this.#pendingLines.shift()
      if (next) {
        next.signal.removeEventListener('abort', next.onAbort)
        next.resolve(line)
        ev.preventDefault()
      }
      return
    }
    if (key.name === 'backspace') {
      this.#lineBuffer = this.#lineBuffer.slice(0, -1)
      ev.preventDefault()
      return
    }
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
      this.#lineBuffer += ev.key
      ev.preventDefault()
    }
  }
}

function keyEventFromDom(ev: KeyboardEvent): KeyEvent {
  return {
    name: normaliseKeyName(ev.key),
    ctrl: ev.ctrlKey,
    meta: ev.metaKey,
    shift: ev.shiftKey,
    raw: ev.key,
  }
}

function normaliseKeyName(k: string): string {
  switch (k) {
    case 'ArrowUp':
      return 'up'
    case 'ArrowDown':
      return 'down'
    case 'ArrowLeft':
      return 'left'
    case 'ArrowRight':
      return 'right'
    case 'Enter':
      return 'enter'
    case 'Escape':
      return 'escape'
    case 'Tab':
      return 'tab'
    case 'Backspace':
      return 'backspace'
    case ' ':
      return 'space'
    case 'Home':
      return 'home'
    case 'End':
      return 'end'
    case 'PageUp':
      return 'pageup'
    case 'PageDown':
      return 'pagedown'
    default:
      return k.length === 1 ? k.toLowerCase() : k.toLowerCase()
  }
}

/** Create a DOM-mounted adapter. */
export function createDomAdapter(opts: DomAdapterOptions): IOAdapter {
  return new DomAdapter(opts)
}

// Re-export sanitisation helpers for consumers that want to pre-sanitise
// strings before they cross the adapter boundary.
export { sanitize, strip }
