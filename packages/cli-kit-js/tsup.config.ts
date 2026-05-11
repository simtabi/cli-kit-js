import { defineConfig } from 'tsup'
import { sharedTsupConfig } from '../../tsup.config.shared'

export default defineConfig({
  ...sharedTsupConfig,
  entry: [
    'src/index.ts',
    'src/core.ts',
    'src/parser.ts',
    'src/ansi.ts',
    'src/text.ts',
    'src/render.ts',
    'src/io.ts',
    'src/config.ts',
    'src/prompts.ts',
    'src/testing.ts',
  ],
})
