# Threat Model

A living document. Every architectural change to packages in `packages/**` should be reviewed against this model and the model updated if the change introduces new assets, surfaces, or adversaries.

## Assets

| ID  | Asset                                | Where it lives                          | Sensitivity |
| --- | ------------------------------------ | --------------------------------------- | ----------- |
| A1  | Consumer's host process              | Node, Deno, Bun runtime                 | High        |
| A2  | Consumer's browser document          | DOM in which renderers mount            | High        |
| A3  | Consumer's terminal session          | TTY in which output is rendered         | Medium      |
| A4  | Secrets in process env / config      | `process.env`, config layers, prompts   | High        |
| A5  | Consumer's CI release pipeline       | GitHub Actions, npm provenance          | High        |
| A6  | Library source code & releases       | This repo, npm registry                 | High        |

## Adversaries

| ID  | Adversary                            | Capability                              |
| --- | ------------------------------------ | --------------------------------------- |
| T1  | Untrusted CLI arg / env / config     | Provides arbitrary bytes to the parser  |
| T2  | Untrusted string rendered to DOM     | Tries to break out into JS execution    |
| T3  | Untrusted string rendered to TTY     | Tries to inject escape sequences        |
| T4  | Malicious transitive dep             | Tries to compromise build or runtime    |
| T5  | Malicious contributor / typosquatter | Tries to land code or impersonate scope |
| T6  | Network-positioned attacker          | Tampers with installs                   |

## Surface → defence mapping

### Argument parsing (T1)

- Result objects via `Object.create(null)`; reject `__proto__|prototype|constructor` keys.
- Property names validated against `/^[A-Za-z_][A-Za-z0-9_-]*$/`.
- Numeric coercion uses anchored regexes only — no `parseInt` on unbounded inputs.
- Maximum argv tokens: 10 000; maximum command depth: 8; configurable but capped.
- Fuzz-tested via `fast-check` on every entry point.

### DOM / HTML rendering (T2)

- All strings auto-escape `& < > " ' /` before reaching the DOM.
- DOM constructed via `document.createElement` + `textContent` + `setAttribute` only. `innerHTML` is forbidden library-wide (CI lint rule).
- Inline `style` is the only attribute set on rendered spans; values match a strict CSS allowlist (`color`, `background-color`, `font-weight`, `font-style`, `text-decoration`).
- Hyperlink schemes restricted to `http`, `https`, `mailto`.
- CSP-compatible: no `eval`, no `Function`, no inline scripts, no inline event handlers. Optional `cspNonce` for `style-src 'nonce-…'`.

### Terminal rendering (T3)

- Allowlist sanitiser strips OSC, DCS, APC, PM, SOS, CSI cursor/scroll/erase/mode sequences from external inputs.
- Keeps only CSI SGR (`\x1b[…m`).
- `writeRaw` exists for explicit consumer use but still passes through escape sanitisation; only `unsafe.ansi` bypasses it, and emits a one-time warning.
- Terminal state guard restores cooked mode, cursor, alternate screen on any exit path.

### Supply chain (T4, T5, T6)

- Zero runtime dependencies.
- Lockfile (`pnpm-lock.yaml`) committed; `--frozen-lockfile` in CI.
- npm publication uses `--provenance` (OIDC-signed via GitHub Actions).
- Package signing via Sigstore once it stabilises on JSR.
- GitHub Actions pinned to commit SHAs, not floating tags.
- CodeQL + Semgrep scans on every PR.
- `pnpm audit` is a CI gate; new high/critical advisories block merge.
- Branch protection: signed commits, required reviews, required checks on `main`.
- `SECURITY.md` documents the disclosure path.

### Sensitive data handling (A4)

- Config-schema keys marked `sensitive: true` are redacted in `inspect`, snapshots, error messages, and logger output.
- Password prompts buffer input in a `SecureString` that wipes the underlying buffer on read.
- No telemetry, no update checks, no network I/O from any package.

## Out-of-scope

- The terminal emulator's own bugs (we do not defend against compromised xterm/iTerm renderers).
- Side channels (timing, EM, acoustic) — this is not a cryptographic library.
- Adversarial hardware.

## Review cadence

Reviewed at every minor release and on demand when a PR touches:

- `packages/parser/**`
- `packages/io/**`
- `packages/ansi/**`
- `packages/ansi-html/**`
- `packages/config/**`
- `.github/workflows/**`
- `packages/*/package.json` dependencies (must remain empty for prod)
