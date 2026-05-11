/**
 * Node 22+ stdio adapter.
 *
 *   - `write` / `writeError` sanitise ANSI through the SGR allowlist before
 *     writing. External strings flowing through these methods cannot inject
 *     cursor movement, clipboard hijack, or screen-clear sequences.
 *   - `writeRaw` bypasses sanitisation. Reserve for code that emits ANSI
 *     you control (spinners, progress bars, alternate-screen apps).
 *   - `readKey` / `readLine` are async; they accept an `AbortSignal` and
 *     reject cleanly if it fires.
 *   - `stdin` is a Web `ReadableStream<Uint8Array>` view of `process.stdin`
 *     for streaming consumers.
 *   - `onResize` listens to `process.stdout` 'resize' events; multiple
 *     subscribers share one underlying listener.
 *
 * The adapter does not install signal handlers or restore terminal state by
 * itself — pair it with `SignalController` and `TerminalGuard` from this
 * package.
 */

import * as readline from 'node:readline'
import { Readable } from 'node:stream'
import { type Capabilities, detectCapabilities, sanitize } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter, KeyEvent, ResizeListener } from './types'

class AbortError extends Error {
  override readonly name = 'AbortError'
  constructor() {
    super('aborted')
  }
}

export interface NodeStdioAdapterOptions {
  /** Override stdout (for tests). */
  readonly stdout?: NodeJS.WriteStream
  /** Override stderr (for tests). */
  readonly stderr?: NodeJS.WriteStream
  /** Override stdin (for tests). */
  readonly stdin?: NodeJS.ReadStream
}

class NodeStdioAdapter implements IOAdapter {
  readonly #stdout: NodeJS.WriteStream
  readonly #stderr: NodeJS.WriteStream
  readonly #stdin: NodeJS.ReadStream
  readonly #resizeListeners = new Set<ResizeListener>()
  #resizeInstalled = false

  constructor(opts: NodeStdioAdapterOptions = {}) {
    this.#stdout = opts.stdout ?? process.stdout
    this.#stderr = opts.stderr ?? process.stderr
    this.#stdin = opts.stdin ?? process.stdin
  }

  write(chunk: string): void {
    this.#stdout.write(sanitize(chunk))
  }

  writeError(chunk: string): void {
    this.#stderr.write(sanitize(chunk))
  }

  writeRaw(chunk: string): void {
    this.#stdout.write(chunk)
  }

  clear(): void {
    // CSI 2J = erase entire display; CSI H = home cursor.
    this.#stdout.write('\x1b[2J\x1b[H')
  }

  get columns(): number {
    return this.#stdout.columns ?? 80
  }

  get rows(): number {
    return this.#stdout.rows ?? 24
  }

  get isTTY(): boolean {
    return this.#stdout.isTTY ?? false
  }

  get isPiped(): boolean {
    return !this.isTTY
  }

  get capabilities(): Capabilities {
    return detectCapabilities({
      env: process.env as Record<string, string | undefined>,
      isTTY: this.isTTY,
      platform: process.platform,
    })
  }

  get stdin(): ReadableStream<Uint8Array> {
    return Readable.toWeb(this.#stdin) as ReadableStream<Uint8Array>
  }

  onResize(listener: ResizeListener): () => void {
    this.#resizeListeners.add(listener)
    if (!this.#resizeInstalled) {
      this.#resizeInstalled = true
      this.#stdout.on('resize', () => {
        for (const l of this.#resizeListeners) {
          try {
            l()
          } catch {
            // isolate listener exceptions
          }
        }
      })
    }
    return () => {
      this.#resizeListeners.delete(listener)
    }
  }

  readLine(signal: AbortSignal): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (signal.aborted) {
        reject(new AbortError())
        return
      }
      const rl = readline.createInterface({
        input: this.#stdin,
        terminal: false,
        crlfDelay: Number.POSITIVE_INFINITY,
      })
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort)
        rl.removeAllListeners()
        rl.close()
        reject(new AbortError())
      }
      signal.addEventListener('abort', onAbort, { once: true })
      rl.once('line', (line) => {
        signal.removeEventListener('abort', onAbort)
        rl.close()
        resolve(line)
      })
      rl.once('close', () => {
        signal.removeEventListener('abort', onAbort)
        // 'close' before 'line' means EOF; resolve with empty string.
        resolve('')
      })
    })
  }

  readKey(signal: AbortSignal): Promise<KeyEvent> {
    return new Promise<KeyEvent>((resolve, reject) => {
      if (signal.aborted) {
        reject(new AbortError())
        return
      }
      readline.emitKeypressEvents(this.#stdin)
      const wasRaw = this.#stdin.isRaw ?? false
      const isTTY = this.#stdin.isTTY ?? false
      if (isTTY) this.#stdin.setRawMode(true)
      this.#stdin.resume()

      const cleanup = () => {
        this.#stdin.off('keypress', onKey)
        if (isTTY) {
          try {
            this.#stdin.setRawMode(wasRaw)
          } catch {
            // ignore
          }
        }
        this.#stdin.pause()
      }

      const onAbort = () => {
        cleanup()
        reject(new AbortError())
      }
      const onKey = (_str: string, key: readline.Key | undefined) => {
        cleanup()
        signal.removeEventListener('abort', onAbort)
        resolve({
          name: key?.name ?? '',
          ctrl: key?.ctrl ?? false,
          meta: key?.meta ?? false,
          shift: key?.shift ?? false,
          raw: key?.sequence ?? '',
        })
      }

      signal.addEventListener('abort', onAbort, { once: true })
      this.#stdin.on('keypress', onKey)
    })
  }
}

/** Create a Node stdio adapter bound to `process.stdin/stdout/stderr`. */
export function createNodeStdio(opts: NodeStdioAdapterOptions = {}): IOAdapter {
  return new NodeStdioAdapter(opts)
}
