/**
 * SecureString — a write-once-read-once buffer for password input.
 *
 * Backed by a Uint8Array (UTF-8). The underlying bytes are zero-filled when:
 *   - `read()` is called (returns the decoded string and clears the buffer),
 *   - `dispose()` is called explicitly,
 *   - GC runs over the instance after dispose (no zero-fill at GC time — JS
 *     can't intercept that — but the buffer is dropped from the closure).
 *
 * Why bother?
 *   - JS string primitives are immutable and live in the interner. Once a
 *     password lands in a string, its bytes are unrecoverable garbage until
 *     the GC runs an unspecified time later, and may persist in heap dumps
 *     or core dumps in the interim. A Uint8Array we control gives us a
 *     window where we can deterministically zero the memory.
 *   - This is best-effort defence: the runtime may still snapshot the
 *     buffer (V8 inline-caches, debugger inspection). We narrow the window;
 *     we do not eliminate it.
 *
 * Usage pattern:
 *   const buf = new SecureString()
 *   buf.appendChar('p'); buf.appendChar('w')
 *   const value = buf.read()      // returns "pw", buffer wiped
 *   buf.dispose()                  // idempotent no-op after read()
 */

const UTF8_ENCODER = new TextEncoder()
const UTF8_DECODER = new TextDecoder('utf-8')

const INITIAL_CAPACITY = 64
const MAX_CAPACITY = 4096

export class SecureString {
  #buf: Uint8Array
  #length = 0
  #disposed = false

  constructor() {
    this.#buf = new Uint8Array(INITIAL_CAPACITY)
  }

  get length(): number {
    return this.#length
  }

  get isDisposed(): boolean {
    return this.#disposed
  }

  /** Number of bytes currently held. (UTF-8 — may differ from character count.) */
  get byteLength(): number {
    return this.#length
  }

  /**
   * Append a printable character (one or more UTF-8 bytes). Throws if the
   * buffer is disposed or would exceed `MAX_CAPACITY` bytes.
   */
  appendChar(ch: string): void {
    this.#assertLive()
    if (ch.length === 0) return
    const bytes = UTF8_ENCODER.encode(ch)
    if (this.#length + bytes.length > MAX_CAPACITY) {
      throw new RangeError('SecureString: maximum buffer size exceeded')
    }
    this.#ensureCapacity(this.#length + bytes.length)
    this.#buf.set(bytes, this.#length)
    this.#length += bytes.length
  }

  /**
   * Remove the last UTF-8 character (variable-length aware).
   */
  popChar(): void {
    this.#assertLive()
    if (this.#length === 0) return
    // Walk back from the tail to find the previous codepoint boundary.
    let i = this.#length - 1
    while (i > 0 && ((this.#buf[i] ?? 0) & 0xc0) === 0x80) {
      // continuation byte; keep walking
      i--
    }
    // Zero the bytes being dropped (defence-in-depth).
    for (let j = i; j < this.#length; j++) this.#buf[j] = 0
    this.#length = i
  }

  /**
   * Read the buffer contents as a string and zero the underlying bytes.
   * After `read()`, the instance is disposed and further mutations throw.
   *
   * Use `peek()` instead when you need to validate without committing.
   */
  read(): string {
    this.#assertLive()
    const slice = this.#buf.subarray(0, this.#length)
    const value = UTF8_DECODER.decode(slice)
    this.dispose()
    return value
  }

  /**
   * Materialise the buffer as a string without disposing it.
   *
   * NOTE: the returned string IS a regular JS primitive — it lives in the
   * interner and the runtime decides when to GC it. Use this when you need
   * to inspect the value mid-prompt (e.g. validation that may fail and
   * leave the buffer open for further edits). For accept paths, prefer
   * `read()` so the bytes are zeroed as soon as you're done with them.
   */
  peek(): string {
    this.#assertLive()
    return UTF8_DECODER.decode(this.#buf.subarray(0, this.#length))
  }

  /**
   * Zero-fill and discard the buffer. Idempotent.
   */
  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    // Zero the active region first, then the whole allocation (defence-in-depth).
    this.#buf.fill(0)
    this.#length = 0
    // Replace the reference with a tiny stub so a stale reference can't
    // recover the previous content.
    this.#buf = new Uint8Array(0)
  }

  #assertLive(): void {
    if (this.#disposed) {
      throw new Error('SecureString: already disposed')
    }
  }

  #ensureCapacity(target: number): void {
    if (target <= this.#buf.length) return
    let cap = this.#buf.length
    while (cap < target) cap = Math.min(cap * 2, MAX_CAPACITY)
    if (cap < target) {
      throw new RangeError('SecureString: maximum buffer size exceeded')
    }
    const next = new Uint8Array(cap)
    next.set(this.#buf.subarray(0, this.#length))
    // Zero the old buffer before dropping the reference.
    this.#buf.fill(0)
    this.#buf = next
  }
}
