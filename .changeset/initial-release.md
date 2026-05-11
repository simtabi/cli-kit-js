---
"@simtabi/cli-kit-js": minor
"@simtabi/cli-kit-js-ansi": minor
"@simtabi/cli-kit-js-config": minor
"@simtabi/cli-kit-js-core": minor
"@simtabi/cli-kit-js-io": minor
"@simtabi/cli-kit-js-parser": minor
"@simtabi/cli-kit-js-prompts": minor
"@simtabi/cli-kit-js-render": minor
"@simtabi/cli-kit-js-testing": minor
"@simtabi/cli-kit-js-text": minor
---

Initial 0.1.0 release. Nine-package monorepo replacing the legacy `universal-cli.js`. Key components:

- **`parser`** — argv → typed parsed args. Mri-class API with the legacy parser's bugs fixed: correct alias direction, negative-number values, symmetric boolean coercion, `count` / `array` / `rest` types, `--no-X` for any type, prototype-pollution defense, DoS caps. Fuzz-tested.
- **`ansi`** — 16/256/truecolor SGR with depth-aware fallback. `NO_COLOR`, `FORCE_COLOR`, `COLORTERM`, `TERM`, `CLIKIT_DETERMINISTIC` all honored. `strip()` + allowlist `sanitize()` (SGR only) defeat OSC clipboard-hijack and CSI cursor injection.
- **`text`** — width-safe `width()` / `truncate()` / `wrap()` / `pad()` / `align()` with inlined Unicode width table. ANSI-aware via `ansi.strip`; grapheme-cluster-aware via `Intl.Segmenter`.
- **`io`** — `IOAdapter` interface plus Node stdio + in-memory implementations. `SignalController` bridges SIGINT/SIGTERM/SIGHUP → AbortSignal with cooperative-shutdown timeout. `TerminalGuard` restores cursor / cooked-mode / SGR on every exit path. DOM + DevTools adapters are stubs (M6).
- **`config`** — schema-driven layered config: defaults → `config/default.json` → `config/{env}.json` → `config/{env}.local.json` → `config/local.json` → env vars → CLI args → runtime overrides. Prototype-pollution-safe JSON parse, path-sandboxed file loads, sensitive-key redaction in snapshots.
- **`render`** — `box` / `table` / `list` / `tree` / `banner` / `progressBar` (pure) plus `createSpinner` (stateful). `/html` subpath: ANSI → HTML conversion with 5-property style allowlist, XSS-safe (fuzz-tested).
- **`core`** — `defineCommand()` + `cli()` fluent builder producing the same immutable `Command`. Async `run()` with signal-aware lifecycle, hook bus, lazy subcommands, "did you mean?" suggestions. Help generator in text / JSON / markdown / groff man.
- **`prompts`** — `text` / `password` / `confirm` / `select` / `multiselect`. Raw-mode TTY UX with non-TTY fallback to `readLine`.
- **`testing`** — `expectStdout` / `expectStderr` / `expectExitCode` matchers, `answer(io, ...keys)` script driver, `snapshotHelp()`, `freezeTime()`, `withEnv()`.
- **`cli-kit-js`** — meta-package re-exporting all of the above with subpath exports.

Zero runtime dependencies (except internal `@simtabi/cli-kit-js-*` workspace packages). Targets Node 22 LTS. Published with npm provenance via GitHub Actions OIDC.
