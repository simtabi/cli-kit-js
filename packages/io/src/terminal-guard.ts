/**
 * TerminalGuard restores terminal state on any exit path.
 *
 * Without this, a crash mid-prompt (or mid-spinner, or mid-alternate-screen)
 * leaves the user's terminal in raw mode, with the cursor hidden, the wrong
 * SGR state, possibly in the alternate-screen buffer. The next shell prompt
 * is then broken in subtle and frustrating ways.
 *
 * The guard captures the original raw-mode state on `install()` and emits a
 * sequence of `\x1b[?25h\x1b[?1049l\x1b[0m` plus `setRawMode(originalState)`
 * on every exit path:
 *
 *   - `process.exit` (via 'exit' event)
 *   - SIGINT / SIGTERM / SIGHUP
 *   - uncaughtException / unhandledRejection
 *
 * Idempotent; safe to call `restore()` multiple times.
 */

const RESTORE_SEQ = '\x1b[?25h\x1b[?1049l\x1b[0m'

export interface TerminalGuardOptions {
  /** Override stdout for tests. */
  readonly stdout?: NodeJS.WriteStream
  /** Override stdin for tests. */
  readonly stdin?: NodeJS.ReadStream
}

export class TerminalGuard {
  #installed = false
  #originalRawMode = false
  #stdout: NodeJS.WriteStream
  #stdin: NodeJS.ReadStream
  readonly #handlers: Array<{
    readonly event: string
    readonly fn: (...args: unknown[]) => void
  }> = []

  constructor(opts: TerminalGuardOptions = {}) {
    this.#stdout = opts.stdout ?? process.stdout
    this.#stdin = opts.stdin ?? process.stdin
  }

  install(): void {
    if (this.#installed) return
    this.#installed = true

    if (this.#stdin.isTTY) {
      this.#originalRawMode = this.#stdin.isRaw ?? false
    }

    const restore = () => this.restore()

    const wrap = (event: string, fn: (...args: unknown[]) => void) => {
      this.#handlers.push({ event, fn })
      process.once(event as 'exit', fn)
    }

    wrap('exit', restore)
    wrap('SIGINT', restore)
    wrap('SIGTERM', restore)
    wrap('SIGHUP', restore)
    wrap('uncaughtException', (err) => {
      restore()
      // Re-throw so Node's default handler still prints + exits non-zero.
      // Doing this in a microtask so we don't interrupt the restore writes.
      queueMicrotask(() => {
        throw err
      })
    })
    wrap('unhandledRejection', (reason) => {
      restore()
      queueMicrotask(() => {
        throw reason
      })
    })
  }

  restore(): void {
    if (!this.#installed) return
    this.#installed = false

    if (this.#stdin.isTTY) {
      try {
        this.#stdin.setRawMode(this.#originalRawMode)
      } catch {
        // Ignore — best effort.
      }
    }

    try {
      this.#stdout.write(RESTORE_SEQ)
    } catch {
      // stdout may already be closed (broken pipe).
    }

    // Remove the registered listeners so we don't double-fire if the host
    // process re-installs a guard later in the same Node lifecycle.
    for (const { event, fn } of this.#handlers) {
      try {
        process.off(event as 'exit', fn)
      } catch {
        // ignore
      }
    }
    this.#handlers.length = 0
  }
}
