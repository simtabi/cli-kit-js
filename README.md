# @simtabi/cli-kit-js

> A safe, fluent, zero-runtime-dependency CLI and rendering toolkit for Node, Deno, Bun, and the browser. The JavaScript implementation of the **cli-kit** family.

**Status:** pre-alpha. APIs unstable until 1.0.0.

The project replaces the legacy single-file `universal-cli.js` (now archived under [`legacy/`](./legacy)) with a TypeScript monorepo of small, focused packages.

## The cli-kit family

`cli-kit` is a multi-language brand. This repository is the JavaScript / TypeScript implementation. Planned siblings:

| GitHub repo              | Status   | Install command                                |
| ------------------------ | -------- | ---------------------------------------------- |
| `simtabi/cli-kit-js`     | active   | `npm i @simtabi/cli-kit-js` (this repo)        |
| `simtabi/cli-kit-py`     | planned  | `pip install simtabi-cli-kit-py`               |
| `simtabi/cli-kit-go`     | planned  | `go get github.com/simtabi/cli-kit-go`         |
| `simtabi/cli-kit-rs`     | planned  | `cargo add simtabi-cli-kit-rs`                 |

Each language implementation is independent — its own repo, release cadence, and idioms — but shares the core design: zero runtime dependencies, safe-by-default rendering, layered config, and a fluent command-builder API.

### Naming convention

A single pattern applies everywhere: **`cli-kit-{language}[-{component}]`**.

| Surface              | Pattern                          | Example                              |
| -------------------- | -------------------------------- | ------------------------------------ |
| GitHub repo          | `cli-kit-{lang}`                 | `simtabi/cli-kit-js`                 |
| npm meta package     | `@simtabi/cli-kit-{lang}`        | `@simtabi/cli-kit-js`                |
| npm subpackage       | `@simtabi/cli-kit-{lang}-{name}` | `@simtabi/cli-kit-js-parser`         |
| Future PyPI          | `simtabi-cli-kit-{lang}[-{name}]`| `simtabi-cli-kit-py`                 |
| Source code identifiers | unmarked                      | `class Command`, `interface IOAdapter` |

The package boundary carries the language signal; class, interface, and function names inside the code do not. A future `cli-kit-py` can use the same `Command` / `IOAdapter` names in Python idiom without collision.

## Goals (JS implementation)

- **Universal** — works in Node 22+, Deno, Bun, and the browser (DOM or DevTools console).
- **Safe by default** — HTML and ANSI escape sanitisation everywhere consumer input meets a renderer. See [`THREAT-MODEL.md`](./THREAT-MODEL.md).
- **Zero runtime dependencies** — every package's `dependencies` field is empty when published.
- **Fluent and functional** — both a declarative `defineCommand({…})` API and a chained `cli('build').option(…).action(…)` builder produce the same immutable config.
- **Tree-shakeable** — each subsystem ships as its own package; `@simtabi/cli-kit-js` is a meta-package that pins them all.

## Packages

| Package                              | Purpose                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `@simtabi/cli-kit-js-core`           | `defineCommand`, runner, lifecycle, AbortSignal wiring, logger          |
| `@simtabi/cli-kit-js-parser`         | argv → typed parsed args                                                |
| `@simtabi/cli-kit-js-ansi`           | SGR colors, strip, env-aware capability detection                       |
| `@simtabi/cli-kit-js-text`           | width-safe truncate / wrap / pad / align                                |
| `@simtabi/cli-kit-js-render`         | box, table, list, tree, banner, progress bar, spinner, ANSI→HTML        |
| `@simtabi/cli-kit-js-io`             | `IOAdapter` + Node, DOM, DevTools, Memory implementations               |
| `@simtabi/cli-kit-js-config`         | Layered config from `./config/*.{env}.json` + env + CLI + runtime       |
| `@simtabi/cli-kit-js-prompts`        | text / password / confirm / select / multiselect interactive prompts    |
| `@simtabi/cli-kit-js-testing`        | Memory adapters, prompt drivers, matchers, snapshot helpers             |
| `@simtabi/cli-kit-js`                | Meta-package re-exporting all of the above with subpath exports         |

> Subpackage names carry `-js` deliberately — it keeps the brand consistent in registry searches and signals which language family the package belongs to. Class, interface, and function names inside the code do not carry `-js`: a class is `Command`, not `JsCommand`.

## Quick start

> Not yet published. Once 0.1.0 is out:

```bash
pnpm add @simtabi/cli-kit-js
```

```ts
import { command, run } from '@simtabi/cli-kit-js'

const build = command({
  meta: { name: 'build', version: '0.1.0' },
  args: {
    input:  { type: 'positional', required: true },
    output: { type: 'string', alias: 'o', default: 'dist/' },
  },
  async run({ args, io }) {
    io.write(`Building ${args.input} → ${args.output}\n`)
  },
})

await run(build)
```

## Documentation

Until the Starlight site is published, see:

- [`THREAT-MODEL.md`](./THREAT-MODEL.md) — security posture.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — development workflow.
- [`SECURITY.md`](./SECURITY.md) — disclosure policy.
- [`legacy/universal-cli-README.md`](./legacy/universal-cli-README.md) — historical reference only.

## License

[MIT](./LICENSE) © Simtabi.
