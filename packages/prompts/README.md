# @simtabi/cli-kit-js-prompts

Interactive prompts. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

## Prompts

| Function       | Returns        | Keys                                                       |
| -------------- | -------------- | ---------------------------------------------------------- |
| `text`         | `string`       | typing · Backspace · Enter · Ctrl+C / Esc cancel           |
| `password`     | `string`       | same; rendered as `*`                                      |
| `confirm`      | `boolean`      | `y` / `n` / Enter (uses default)                           |
| `select`       | `T`            | ↑/↓ · Enter · Home / End                                   |
| `multiselect`  | `T[]`          | ↑/↓ · Space toggle · Enter confirm · Ctrl+A select all     |

Non-TTY fallback for each: prompt + numbered list (where applicable) + `io.readLine`.

## Install

```bash
npm i @simtabi/cli-kit-js-prompts
```

## Use

```ts
import { createNodeStdio } from '@simtabi/cli-kit-js-io'
import { text, password, confirm, select, multiselect } from '@simtabi/cli-kit-js-prompts'

const io = createNodeStdio()

const name = await text({ io, message: 'Your name?', default: 'World' })
const pw   = await password({ io, message: 'Password?' })
const ok   = await confirm({ io, message: 'Continue?', default: true })

const env = await select({
  io,
  message: 'Environment?',
  options: [
    { value: 'dev',  label: 'Development' },
    { value: 'prod', label: 'Production', description: 'careful!' },
  ],
})

const features = await multiselect({
  io,
  message: 'Pick features:',
  options: [
    { value: 'auth',  label: 'Auth' },
    { value: 'cache', label: 'Cache' },
    { value: 'queue', label: 'Queue' },
  ],
  minSelected: 1,
})
```

## License

[MIT](./LICENSE) © Simtabi.
