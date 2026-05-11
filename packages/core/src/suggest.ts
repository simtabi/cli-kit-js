/**
 * "Did you mean … ?" suggestions via Levenshtein distance.
 *
 * Bounded distance for input length (no unbounded matrix); rejects suggestions
 * whose distance exceeds `Math.ceil(input.length / 2)` to avoid wild guesses.
 */

const MAX_INPUT = 64

export function suggest(
  input: string,
  candidates: readonly string[],
  limit = 3,
): readonly string[] {
  if (input.length === 0 || input.length > MAX_INPUT) return []
  if (candidates.length === 0) return []
  const threshold = Math.max(1, Math.ceil(input.length / 2))
  const scored: Array<{ value: string; dist: number }> = []
  for (const c of candidates) {
    if (c.length === 0 || c.length > MAX_INPUT) continue
    const d = levenshtein(input, c)
    if (d <= threshold) scored.push({ value: c, dist: d })
  }
  scored.sort((a, b) => a.dist - b.dist || a.value.localeCompare(b.value))
  return scored.slice(0, limit).map((s) => s.value)
}

/**
 * Edit-distance via two-row dynamic programming. O(m × n) time, O(min(m,n))
 * space. Inputs are length-capped above, so this is constant-bounded.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  if (a.length > b.length) {
    const tmp = a
    a = b
    b = tmp
  }
  const m = a.length
  const n = b.length
  let prev = new Array<number>(m + 1)
  let curr = new Array<number>(m + 1)
  for (let i = 0; i <= m; i++) prev[i] = i
  for (let j = 1; j <= n; j++) {
    curr[0] = j
    const bChar = b.charCodeAt(j - 1)
    for (let i = 1; i <= m; i++) {
      const cost = a.charCodeAt(i - 1) === bChar ? 0 : 1
      const prevI = prev[i] ?? 0
      const currI1 = curr[i - 1] ?? 0
      const prevI1 = prev[i - 1] ?? 0
      curr[i] = Math.min(prevI + 1, currI1 + 1, prevI1 + cost)
    }
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[m] ?? 0
}
