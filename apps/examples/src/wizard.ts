#!/usr/bin/env node
/**
 * Example: interactive prompt wizard using the new `wizard()` primitive.
 *
 *   node apps/examples/src/wizard.ts
 *
 * Walks the user through a fake project-init flow. Exercises every prompt:
 * text (with validation), password (SecureString-backed), confirm,
 * select, multiselect, number. Pipe input also works:
 *
 *   echo -e "myproj\\nhunter2\\ny\\n1\\n1,3\\n8080" | node wizard.ts
 */

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'
import {
  confirm,
  multiselect,
  number,
  outro,
  PromptCancelledError,
  password,
  select,
  text,
  wizard,
} from '@simtabi/cli-kit-js/prompts'
import { box, list } from '@simtabi/cli-kit-js/render'

type State = {
  name: string
  token: string
  env: 'dev' | 'staging' | 'prod'
  features: readonly string[]
  port: number
  proceed: boolean
  // Wizard state extends Record<string, unknown>.
  [key: string]: unknown
}

const wizardCmd = defineCommand({
  meta: {
    name: 'wizard',
    version: '0.1.0',
    description: 'Interactive project scaffolder.',
  },
  async run({ io }) {
    try {
      const result = await wizard<State>({
        io,
        intro: 'Project setup',
        steps: [
          {
            id: 'name',
            prompt: ({ io }) =>
              text({
                io,
                message: 'Project name?',
                default: 'my-project',
                validate: (v) =>
                  /^[a-z][a-z0-9-]{1,40}$/i.test(v)
                    ? true
                    : 'lowercase letters, digits, and hyphens; 2–41 chars',
              }),
          },
          {
            id: 'token',
            prompt: ({ io }) => password({ io, message: 'Deploy token? (leave blank to skip)' }),
          },
          {
            id: 'env',
            prompt: ({ io }) =>
              select<'dev' | 'staging' | 'prod'>({
                io,
                message: 'Default environment?',
                options: [
                  { value: 'dev', label: 'Development' },
                  { value: 'staging', label: 'Staging' },
                  { value: 'prod', label: 'Production', description: 'careful!' },
                ],
              }),
          },
          {
            id: 'features',
            prompt: ({ io }) =>
              multiselect({
                io,
                message: 'Pick features:',
                options: [
                  { value: 'auth', label: 'Authentication' },
                  { value: 'cache', label: 'Cache layer' },
                  { value: 'queue', label: 'Background queue' },
                  { value: 'metrics', label: 'Metrics export' },
                ],
                minSelected: 1,
              }),
          },
          {
            id: 'port',
            prompt: ({ io }) =>
              number({
                io,
                message: 'Listen port?',
                default: 3000,
                min: 1024,
                max: 65535,
                integer: true,
              }),
          },
          {
            id: 'proceed',
            prompt: ({ io, state }) =>
              confirm({
                io,
                message: `Create ${colors.cyan(state.name)} (${state.env})?`,
                default: true,
              }),
          },
        ],
      })

      if (!result.proceed) {
        io.write(`${colors.yellow('Aborted.')}\n`)
        return
      }

      io.write('\n')
      io.write(
        `${box(
          `Project created!\n\nName:     ${colors.cyan(result.name)}\nEnv:      ${colors.cyan(result.env)}\nPort:     ${result.port}\nFeatures: ${result.features.length}${result.token.length > 0 ? `\nToken:    ${'•'.repeat(8)} (saved)` : ''}`,
          { style: 'round', padding: { x: 2, y: 1 }, title: '✓' },
        )}\n`,
      )
      io.write(`\n${colors.bold('Next steps:')}\n`)
      io.write(`${list([`cd ${result.name}`, 'pnpm install', 'pnpm dev'])}\n`)
      outro(io, 'Done')
    } catch (err) {
      if (err instanceof PromptCancelledError) {
        io.write(`\n${colors.yellow('Cancelled.')}\n`)
        return
      }
      throw err
    }
  },
})

await run(wizardCmd)
