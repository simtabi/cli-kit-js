import { defineConfig } from 'tsup'
import { sharedTsupConfig } from '../../tsup.config.shared'

export default defineConfig({
  ...sharedTsupConfig,
  entry: ['src/index.ts', 'src/node.ts', 'src/dom.ts', 'src/console.ts', 'src/memory.ts'],
})
