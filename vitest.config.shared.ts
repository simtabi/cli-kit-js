import { defineConfig } from 'vitest/config'

/**
 * Shared vitest preset for unit tests across the monorepo.
 *
 * Per-package configs extend this and add coverage thresholds or
 * environment overrides (e.g. `environment: 'jsdom'` for browser packages).
 */
export const sharedVitestConfig = defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    typecheck: {
      enabled: false,
    },
    pool: 'forks',
  },
})

export default sharedVitestConfig
