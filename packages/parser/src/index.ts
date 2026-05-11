/**
 * `@simtabi/cli-kit-js-parser`
 *
 * argv → typed parsed args. Mri-compatible with deliberate fixes:
 *   - alias canonicalization in the documented direction
 *   - negative numbers accepted as option values
 *   - boolean coercion symmetric for true/1/yes and false/0/no
 *   - `--no-<flag>` works without prior boolean registration
 *   - prototype-pollution defenses on result keys
 *   - DoS caps on argv length and command depth
 *
 * Implementation lands in M2.
 */

export const __version = '0.0.0'
