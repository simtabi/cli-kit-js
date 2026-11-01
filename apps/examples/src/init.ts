#!/usr/bin/env node
/**
 * Example: project scaffolder built on `form` + `autocomplete` + `editList`.
 *
 *   node apps/examples/src/init.ts
 *
 * Demonstrates the new prompt set landing alongside wizard():
 *   - `form()` for grouped fields with a single header
 *   - `autocomplete` for a typeahead over a region list
 *   - `editList` for free-form tags
 *   - `number` with min/max bounds
 *
 * Pipes in any sequence of newline-separated answers — the example degrades
 * gracefully on non-TTY stdin.
 */

import { defineCommand, run } from '@simtabi/cli-kit-js'
import { colors } from '@simtabi/cli-kit-js/ansi'
import { PromptCancelledError, form, outro } from '@simtabi/cli-kit-js/prompts'
import { box } from '@simtabi/cli-kit-js/render'

const regions = [
  { value: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
  { value: 'us-east-2', label: 'us-east-2 (Ohio)' },
  { value: 'us-west-1', label: 'us-west-1 (N. California)' },
  { value: 'us-west-2', label: 'us-west-2 (Oregon)' },
  { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
  { value: 'eu-central-1', label: 'eu-central-1 (Frankfurt)' },
  { value: 'ap-south-1', label: 'ap-south-1 (Mumbai)' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
]

interface Result {
  readonly name: string
  readonly region: string
  readonly port: number
  readonly tags: readonly string[]
  readonly enableHttps: boolean
}

const init = defineCommand({
  meta: {
    name: 'init',
    version: '0.1.0',
    description: 'Scaffold a new project with form-driven config.',
  },
  async run({ io }) {
    try {
      const result = (await form({
        io,
        message: 'New service',
        fields: [
          {
            name: 'name',
            kind: 'text',
            message: 'Service name?',
            default: 'svc',
            validate: (v) => (/^[a-z][a-z0-9-]{1,40}$/.test(v) ? true : 'lowercase, digits, hyphens'),
          },
          {
            name: 'region',
            kind: 'autocomplete',
            message: 'Deploy region?',
            source: regions,
          },
          {
            name: 'port',
            kind: 'number',
            message: 'Listen port?',
            default: 8080,
            min: 1024,
            max: 65535,
            integer: true,
          },
          {
            name: 'tags',
            kind: 'editList',
            message: 'Tags (Enter twice to finish)',
            min: 0,
            max: 8,
            validate: (v) =>
              /^[a-z0-9:_-]+$/.test(v) ? true : 'lowercase, digits, : _ -',
          },
          {
            name: 'enableHttps',
            kind: 'confirm',
            message: 'Enable HTTPS?',
            default: true,
          },
        ],
      })) as unknown as Result

      io.write('\n')
      io.write(
        `${box(
          `Service initialised\n\nName:    ${colors.cyan(result.name)}\nRegion:  ${result.region}\nPort:    ${result.port}\nHTTPS:   ${result.enableHttps ? 'on' : 'off'}\nTags:    ${result.tags.length > 0 ? result.tags.join(', ') : colors.gray('—')}`,
          { style: 'round', padding: { x: 2, y: 1 }, title: '✓' },
        )}\n`,
      )
      outro(io, 'Ready')
    } catch (err) {
      if (err instanceof PromptCancelledError) {
        io.write(`\n${colors.yellow('Cancelled.')}\n`)
        return
      }
      throw err
    }
  },
})

await run(init)
