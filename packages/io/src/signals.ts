/**
 * Signal → AbortSignal bridge.
 *
 *   - SIGINT / SIGTERM / SIGHUP: first occurrence aborts the controller
 *     (cooperative shutdown) and arms a hard-exit timer (default 5 s).
 *     A second occurrence triggers immediate `process.exit` with the
 *     UNIX-conventional code (130 for SIGINT, 143 for SIGTERM).
 *   - SIGPIPE: `process.exit(0)` — a downstream pipe closed (`mycli | head`),
 *     which is graceful, not exceptional.
 *
 * `SignalController` is single-use; instantiate one per `run()` invocation.
 */

export interface SignalControllerOptions {
  /** Cooperative-shutdown grace window. Default 5 000 ms. */
  readonly shutdownTimeoutMs?: number
  /** Override for tests. */
  readonly target?: NodeJS.Process
}

const SIGNAL_EXIT_CODES: Record<string, number> = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGHUP: 129,
}

export class SignalController {
  readonly #controller = new AbortController()
  readonly #target: NodeJS.Process
  readonly #timeoutMs: number
  readonly #installed: Array<{ event: string; fn: (...args: unknown[]) => void }> = []
  #signalCount = 0
  #shutdownTimer: ReturnType<typeof setTimeout> | null = null
  #disposed = false

  constructor(opts: SignalControllerOptions = {}) {
    this.#timeoutMs = opts.shutdownTimeoutMs ?? 5000
    this.#target = opts.target ?? process

    this.#install('SIGINT')
    this.#install('SIGTERM')
    this.#install('SIGHUP')
    this.#installPipeHandler()
  }

  get signal(): AbortSignal {
    return this.#controller.signal
  }

  #install(name: string): void {
    const handler = () => this.#onSignal(name)
    this.#target.on(name as 'SIGINT', handler)
    this.#installed.push({ event: name, fn: handler })
  }

  #installPipeHandler(): void {
    const handler = () => {
      // Graceful exit on broken pipe.
      this.dispose()
      this.#target.exit(0)
    }
    this.#target.on('SIGPIPE' as 'SIGINT', handler)
    this.#installed.push({ event: 'SIGPIPE', fn: handler })
  }

  #onSignal(name: string): void {
    this.#signalCount++
    if (this.#signalCount >= 2) {
      // Hard exit — user is impatient.
      this.dispose()
      this.#target.exit(SIGNAL_EXIT_CODES[name] ?? 1)
      return
    }
    if (!this.#controller.signal.aborted) {
      // Reason carries the signal name for handlers that inspect it.
      this.#controller.abort(new Error(`signal ${name}`))
    }
    // Arm hard-exit timer.
    this.#shutdownTimer = setTimeout(() => {
      this.dispose()
      this.#target.exit(SIGNAL_EXIT_CODES[name] ?? 1)
    }, this.#timeoutMs)
    // Don't keep event loop alive just for this timer.
    this.#shutdownTimer.unref?.()
  }

  /** Test helper: simulate the receipt of `name` without raising it for real. */
  simulate(name: string): void {
    this.#onSignal(name)
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    if (this.#shutdownTimer) {
      clearTimeout(this.#shutdownTimer)
      this.#shutdownTimer = null
    }
    for (const { event, fn } of this.#installed) {
      try {
        this.#target.off(event as 'SIGINT', fn)
      } catch {
        // ignore
      }
    }
    this.#installed.length = 0
  }
}
