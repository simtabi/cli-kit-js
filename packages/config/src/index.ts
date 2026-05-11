/**
 * `@simtabi/cli-kit-js-config`
 *
 * Layered, schema-validated configuration. Precedence (low → high):
 *
 *   1. Schema defaults (TS source)
 *   2. config/default.json
 *   3. config/{env}.json
 *   4. config/{env}.local.json   (gitignored)
 *   5. config/local.json          (gitignored)
 *   6. process env vars (mapped by schema)
 *   7. parsed CLI args (mapped by schema)
 *   8. .set() runtime overrides
 *
 * Reads are lazy and memoised; mutations invalidate only the affected path.
 * `sensitive: true` keys are redacted in snapshots and logs. Prototype-pollution
 * defenses on every JSON parse.
 *
 * Implementation lands in M3a.
 */

export const __version = '0.0.0'
