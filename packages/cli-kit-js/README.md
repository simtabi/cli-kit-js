# @simtabi/cli-kit-js

> Meta-package for the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

Re-exports the public API of every subpackage so you can pull the whole kit with one install. Tree-shakes cleanly (`sideEffects: false`); subpath imports skip the indirection entirely.

**Status:** pre-alpha. Implementation lands incrementally per the milestone plan in the root README.

## Install

```bash
npm i @simtabi/cli-kit-js
```

## Use

```ts
// Whole-kit import (tree-shakes to only what you use)
import { command, run, box, table } from '@simtabi/cli-kit-js'

// Subpath import (skips even the re-export layer)
import { parse } from '@simtabi/cli-kit-js/parser'
import { detectColorDepth } from '@simtabi/cli-kit-js/ansi'
```

## Subpath exports

| Path                                | Re-exports                          |
| ----------------------------------- | ----------------------------------- |
| `@simtabi/cli-kit-js`               | everything (except testing)         |
| `@simtabi/cli-kit-js/core`          | `@simtabi/cli-kit-js-core`          |
| `@simtabi/cli-kit-js/parser`        | `@simtabi/cli-kit-js-parser`        |
| `@simtabi/cli-kit-js/ansi`          | `@simtabi/cli-kit-js-ansi`          |
| `@simtabi/cli-kit-js/text`          | `@simtabi/cli-kit-js-text`          |
| `@simtabi/cli-kit-js/render`        | `@simtabi/cli-kit-js-render`        |
| `@simtabi/cli-kit-js/io`            | `@simtabi/cli-kit-js-io`            |
| `@simtabi/cli-kit-js/config`        | `@simtabi/cli-kit-js-config`        |
| `@simtabi/cli-kit-js/prompts`       | `@simtabi/cli-kit-js-prompts`       |
| `@simtabi/cli-kit-js/testing`       | `@simtabi/cli-kit-js-testing` (dev) |

## License

[MIT](./LICENSE) © Simtabi.
