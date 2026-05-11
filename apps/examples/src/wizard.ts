#!/usr/bin/env node
/**
 * Example: interactive prompt wizard.
 *
 *   node apps/examples/src/wizard.ts
 *
 * Walks the user through a fake project-init flow. Exercises every prompt:
 * text (with validation), password (SecureString-backed), confirm,
 * select, multiselect. Pipe input also works:
 *
 *   echo -e "myproj\\nhunter2\\ny\\n1\\n1,3" | node wizard.ts
 */

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'
import {
  PromptCancelledError,
  confirm,
  multiselect,
  password,
  select,
  text,
} from '@simtabi/cli-kit-js/prompts'
import { box, list } from '@simtabi/cli-kit-js/render'

const wizard = defineCommand({
  meta: {
    name: 'wizard',
    version: '0.1.0',
    description: 'Interactive project scaffolder.',
  },
  async run({ io, signal }) {
    try {
      const name = await text({
        io,
        signal,
        message: 'Project name?',
        default: 'my-project',
        validate: (v) =>
          /^[a-z][a-z0-9-]{1,40}$/i.test(v)
            ? true
            : 'lowercase letters, digits, and hyphens; 2–41 chars',
      })

      const apiKey = await password({
        io,
        signal,
        message: 'Deploy token? (leave blank to skip)',
      })

      const env = await select({
        io,
        signal,
        message: 'Default environment?',
        options: [
          { value: 'dev', label: 'Development' },
          { value: 'staging', label: 'Staging' },
          { value: 'prod', label: 'Production', description: 'careful!' },
        ],
      })

      const features = await multiselect({
        io,
        signal,
        message: 'Pick features:',
        options: [
          { value: 'auth', label: 'Authentication' },
          { value: 'cache', label: 'Cache layer' },
          { value: 'queue', label: 'Background queue' },
          { value: 'metrics', label: 'Metrics export' },
        ],
        minSelected: 1,
      })

      const proceed = await confirm({
        io,
        signal,
        message: `Create ${colors.cyan(name)} (${env})?`,
        default: true,
      })

      if (!proceed) {
        io.write(`${colors.yellow('Aborted.')}\n`)
        return
      }

      io.write('\n')
      io.write(
        `${box(
          `Project created!\n\nName:     ${colors.cyan(name)}\nEnv:      ${colors.cyan(env)}\nFeatures: ${features.length}${apiKey.length > 0 ? `\nToken:    ${'•'.repeat(8)} (saved)` : ''}`,
          { style: 'round', padding: { x: 2, y: 1 }, title: '✓' },
        )}\n`,
      )
      io.write(`\n${colors.bold('Next steps:')}\n`)
      io.write(`${list([`cd ${name}`, 'pnpm install', 'pnpm dev'])}\n`)
    } catch (err) {
      if (err instanceof PromptCancelledError) {
        io.write(`\n${colors.yellow('Cancelled.')}\n`)
        return
      }
      throw err
    }
  },
})

await run(wizard)
