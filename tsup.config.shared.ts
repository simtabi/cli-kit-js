import type { Options } from 'tsup'

/**
 * Shared tsup preset for all publishable packages.
 *
 * Builds ESM + CJS + .d.ts from `src/index.ts`. Treeshakes, sourcemaps,
 * no external runtime deps (we have none — fail loudly if that changes).
 */
export const sharedTsupConfig: Options = {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  platform: 'neutral',
  outExtension: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : '.js',
  }),
  // Runtime dependencies are forbidden across the monorepo; this
  // explicit empty list documents the contract.
  external: [],
  noExternal: [],
}
