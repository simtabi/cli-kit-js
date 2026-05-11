/**
 * Scoped env-var overrides.
 *
 *   await withEnv({ NO_COLOR: '1' }, async () => {
 *     // inside this block, process.env.NO_COLOR === '1'
 *   })
 *
 * Original values (or absence) are restored even if the callback throws.
 */

export async function withEnv<T>(
  overrides: Readonly<Record<string, string | undefined>>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const saved = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(overrides)) {
    saved.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  try {
    return await fn()
  } finally {
    for (const [key, prev] of saved) {
      if (prev === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = prev
      }
    }
  }
}
