/**
 * In-memory IOAdapter for tests. Captures `write`/`writeError` into buffers;
 * replays queued keystrokes and lines for prompts.
 */

import { sanitize, type Capabilities, type ColorDepth } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter, KeyEvent, ResizeListener } from './types'

export interface MemoryAdapterOptions {
  readonly columns?: number
  readonly rows?: number
  readonly isTTY?: boolean
  readonly color?: ColorDepth
  readonly unicode?: boolean
}

class AbortError extends Error {
  override readonly name = 'AbortError'
  constructor() {
    super('aborted')
  }
}

export class MemoryAdapter implements IOAdapter {
  // Public buffers — tests assert against these directly.
  stdout = ''
  stderr = ''
  /** Raw (un-sanitised) writes received. Used by `writeRaw`. */
  rawWrites: string[] = []
  /** Count of `clear()` calls. */
  clearCount = 0

  #columns: number
  #rows: number
  #isTTY: boolean
  #color: ColorDepth
  #unicode: boolean

  readonly #keyQueue: KeyEvent[] = []
  readonly #lineQueue: string[] = []
  readonly #resizeListeners = new Set<ResizeListener>()

  constructor(opts: MemoryAdapterOptions = {}) {
    this.#columns = opts.columns ?? 80
    this.#rows = opts.rows ?? 24
    this.#isTTY = opts.isTTY ?? false
    this.#color = opts.color ?? (opts.isTTY ? 24 : 0)
    this.#unicode = opts.unicode ?? true
  }

  write(chunk: string): void {
    this.stdout += sanitize(chunk)
  }

  writeError(chunk: string): void {
    this.stderr += sanitize(chunk)
  }

  writeRaw(chunk: string): void {
    this.rawWrites.push(chunk)
    this.stdout += chunk
  }

  clear(): void {
    this.clearCount++
    this.stdout = ''
  }

  get columns(): number {
    return this.#columns
  }

  get rows(): number {
    return this.#rows
  }

  get isTTY(): boolean {
    return this.#isTTY
  }

  get isPiped(): boolean {
    return !this.#isTTY
  }

  get capabilities(): Capabilities {
    return {
      color: this.#color,
      unicode: this.#unicode,
      hyperlinks: false,
      stream: 'stdout',
    }
  }

  get stdin(): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close()
      },
    })
  }

  onResize(listener: ResizeListener): () => void {
    this.#resizeListeners.add(listener)
    return () => {
      this.#resizeListeners.delete(listener)
    }
  }

  /** Tests call this to simulate a resize. */
  setSize(columns: number, rows: number): void {
    this.#columns = columns
    this.#rows = rows
    for (const l of this.#resizeListeners) {
      try {
        l()
      } catch {
        // Listener exceptions are isolated.
      }
    }
  }

  /** Queue a key for the next `readKey()` call. */
  queueKey(key: Partial<KeyEvent> & { readonly name: string }): void {
    this.#keyQueue.push({
      ctrl: false,
      meta: false,
      shift: false,
      raw: key.name,
      ...key,
    })
  }

  /** Queue a line for the next `readLine()` call. */
  queueLine(line: string): void {
    this.#lineQueue.push(line)
  }

  async readKey(signal: AbortSignal): Promise<KeyEvent> {
    if (signal.aborted) throw new AbortError()
    const k = this.#keyQueue.shift()
    if (!k) throw new Error('MemoryAdapter: no queued key — use queueKey() first')
    return k
  }

  async readLine(signal: AbortSignal): Promise<string> {
    if (signal.aborted) throw new AbortError()
    const l = this.#lineQueue.shift()
    if (l === undefined) {
      throw new Error('MemoryAdapter: no queued line — use queueLine() first')
    }
    return l
  }
}
