/**
 * `@simtabi/cli-kit-js`
 *
 * Meta-package. Re-exports the public API of every cli-kit-js subpackage so
 * consumers can pull the whole kit with a single dependency.
 *
 * Tree-shaking is fully supported (`sideEffects: false`); subpath imports
 * (e.g. `@simtabi/cli-kit-js/parser`) skip even the re-export indirection.
 *
 * Implementation: each barrel below re-exports from a subpackage as those
 * land in their respective milestones.
 */

export * from '@simtabi/cli-kit-js-ansi'
export * from '@simtabi/cli-kit-js-config'
export * from '@simtabi/cli-kit-js-core'
export * from '@simtabi/cli-kit-js-io'
export * from '@simtabi/cli-kit-js-parser'
export * from '@simtabi/cli-kit-js-render'
export * from '@simtabi/cli-kit-js-text'
