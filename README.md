# @simtabi/cli-kit-js

> A safe, fluent, zero-runtime-dependency CLI and rendering toolkit for Node, Deno, Bun, and the browser. The JavaScript implementation of the **cli-kit** family.

[![CI](https://github.com/simtabi/cli-kit-js/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/simtabi/cli-kit-js/actions/workflows/ci.yml)
[![CodeQL](https://github.com/simtabi/cli-kit-js/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/simtabi/cli-kit-js/actions/workflows/codeql.yml)
[![OSSF Scorecard](https://api.scorecard.dev/projects/github.com/simtabi/cli-kit-js/badge)](https://scorecard.dev/viewer/?uri=github.com/simtabi/cli-kit-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-3c873a.svg)](./.nvmrc)

**Status:** functionally complete, awaiting `v0.1.0` publish. API stabilises at `1.0.0`.

The project replaces the legacy single-file `universal-cli.js` (now archived under [`legacy/`](./legacy)) with a TypeScript monorepo of nine small, focused packages and a Starlight documentation site.

## Table of contents

- [The cli-kit family](#the-cli-kit-family)
- [Goals](#goals-js-implementation)
- [Packages](#packages)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Apps](#apps)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

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
- **Safe by default** — HTML and ANSI escape sanitisation everywhere consumer input meets a renderer. Password buffers held in `SecureString`, zeroed on read. See [`THREAT-MODEL.md`](./THREAT-MODEL.md).
- **Zero runtime dependencies** — every package's `dependencies` field is empty when published (workspace siblings only). CI-enforced.
- **Fluent and functional** — both a declarative `defineCommand({…})` API and a chained `cli('build').option(…).action(…)` builder produce the same immutable config.
- **Tree-shakeable** — each subsystem ships as its own package; `@simtabi/cli-kit-js` is a meta-package that pins them all.

## Packages

| Package                              | Purpose                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `@simtabi/cli-kit-js-core`           | `defineCommand`, runner, lifecycle, AbortSignal wiring, hooks, help     |
| `@simtabi/cli-kit-js-parser`         | argv → typed parsed args                                                |
| `@simtabi/cli-kit-js-ansi`           | SGR colors, strip + sanitize allowlist, env-aware capability detection  |
| `@simtabi/cli-kit-js-text`           | width-safe truncate / wrap / pad / align with inlined Unicode table     |
| `@simtabi/cli-kit-js-render`         | box, table, list, tree, banner, progress bar, spinner, ANSI→HTML        |
| `@simtabi/cli-kit-js-io`             | `IOAdapter` + Node, DOM, DevTools, Memory implementations               |
| `@simtabi/cli-kit-js-config`         | Layered config from `./config/*.{env}.json` + env + CLI + runtime       |
| `@simtabi/cli-kit-js-prompts`        | text / password / confirm / select / multiselect (`SecureString` buffer)|
| `@simtabi/cli-kit-js-testing`        | Memory adapters, prompt drivers, matchers, snapshot helpers             |
| `@simtabi/cli-kit-js`                | Meta-package re-exporting all of the above with subpath exports         |

> Subpackage names carry `-js` deliberately — it keeps the brand consistent in registry searches and signals which language family the package belongs to. Class, interface, and function names inside the code do not carry `-js`: a class is `Command`, not `JsCommand`.

## Quick start

```bash
pnpm add @simtabi/cli-kit-js
```

```ts
import { defineCommand, run } from '@simtabi/cli-kit-js'

const build = defineCommand({
  meta: { name: 'build', version: '0.1.0' },
  args: {
    input:   { type: 'positional', required: true },
    output:  { type: 'string', alias: 'o', default: 'dist/' },
    verbose: { type: 'count', alias: 'v' },
  },
  async run({ args, io, signal }) {
    io.write(`Building ${args.input} → ${args.output}\n`)
  },
})

await run(build)
```

The same renderers work in the browser through `@simtabi/cli-kit-js-io/dom`:

```ts
import { createDomAdapter } from '@simtabi/cli-kit-js-io/dom'
import { box } from '@simtabi/cli-kit-js/render'

const io = createDomAdapter({ mount: '#terminal' })
io.write(box('Hello from the browser!', { style: 'round' }))
```

XSS-safe by default — every consumer character is HTML-escaped before reaching the DOM, every span is built with `createElement` + `textContent` + a 5-property `style` allowlist. No `innerHTML`, no `eval`, no inline event handlers.

## Documentation

- **[docs site](https://cli-kit-js.pages.dev)** (Starlight, deployed to Cloudflare Pages) — guides, per-package API, concepts.
- [`THREAT-MODEL.md`](./THREAT-MODEL.md) — full security posture and per-adversary defence mapping.
- [`SECURITY.md`](./SECURITY.md) — disclosure policy.
- [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md) — release-time runbook.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — development workflow.
- [`RELEASING.md`](./RELEASING.md) — release flow + versioning policy.
- [`legacy/universal-cli-README.md`](./legacy/universal-cli-README.md) — historical reference only.

## Apps

- [`apps/examples`](./apps/examples) — Node example CLIs.
- [`apps/playground`](./apps/playground) — Vite browser playground showing the DOM adapter rendering box / table / tree / progress / spinner. Deployed to Cloudflare Pages.
- [`docs`](./docs) — Starlight site source.

## Security

- **Audit-defensible**, not "military-grade" (an honest framing for what the code achieves).
- Zero runtime dependencies, CI-enforced.
- npm publication uses `--provenance` via GitHub Actions OIDC.
- CodeQL + Semgrep + `pnpm audit` + OSSF Scorecard run on every PR and on a weekly schedule.
- Prototype-pollution-safe parsing across parser + config.
- XSS-safe HTML rendering with 5-property style allowlist; allowlist ANSI sanitiser strips OSC clipboard-hijack, cursor injection, screen-clear and every non-SGR sequence.
- Password buffers stored in `SecureString` (Uint8Array, zero-filled on read/dispose).
- Property-based fuzz tests across parser, ansi/sanitize, render/html, io/dom, config/json.
- CycloneDX SBOM attached to every release.

Disclosure: **security@simtabi.com**. Do not open a public issue.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Requirements:

- Node 22+, pnpm 9+.
- Every PR touching a published package needs a Changeset (`pnpm changeset`).
- Security-sensitive paths trigger a `@simtabi/security` review per `CODEOWNERS`.
- Zero external runtime deps — enforced in CI; PRs adding them fail.

## License

[MIT](./LICENSE) © Simtabi.
