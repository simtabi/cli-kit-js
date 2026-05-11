/**
 * Deterministic-time helpers. Scoped — every helper returns a `restore()`
 * function and the snippet that opened the override owns closing it.
 */

interface RestorableMock {
  restore(): void
}

export function freezeTime(at: Date | string | number): RestorableMock {
  const stamp = typeof at === 'number' ? at : new Date(at).getTime()
  const originalNow = Date.now
  const originalPerfNow =
    typeof performance !== 'undefined' ? performance.now.bind(performance) : null
  let perfStart = 0
  Date.now = () => stamp
  if (originalPerfNow) {
    perfStart = originalPerfNow()
    performance.now = () => 0
  }
  return {
    restore() {
      Date.now = originalNow
      if (originalPerfNow) {
        // Restore the original implementation; rewriting `performance.now`
        // here would still be a function pointing at the polyfill.
        performance.now = originalPerfNow
      }
      // Reference to silence unused-var lint when perfStart isn't read.
      void perfStart
    },
  }
}
