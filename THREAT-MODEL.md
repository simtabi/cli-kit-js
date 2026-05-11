# Threat Model

A living document. Every architectural change to packages in `packages/**` should be reviewed against this model and the model updated if the change introduces new assets, surfaces, or adversaries.

> Last review: aligned with the implementation as of the M6 commit (`d8cdcdc`). Next scheduled review: every minor release.

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
| T7  | Untrusted JSON config file           | Attempts prototype pollution            |
| T8  | Prompt-time keystroke injection      | Tries to leak password buffer           |

## Surface → defence mapping

### Argument parsing (T1)
*Package: `@simtabi/cli-kit-js-parser`*

- Result objects via `Object.create(null)`; reject `__proto__|prototype|constructor` keys.
- Property names validated against `/^[A-Za-z_][A-Za-z0-9_-]*$/`.
- Numeric coercion uses anchored regexes only — no `parseInt` on unbounded inputs.
- Maximum argv tokens: 10 000; maximum total argv bytes: 1 MiB. Configurable, capped.
- Negative numbers accepted as values (regression vs. legacy parser).
- Strict mode rejects unknown flags by default; opt-out per command.
- Fuzz-tested with `fast-check`: never-throws invariant, null-prototype invariant, no-forbidden-key invariant, `Object.prototype`-never-polluted invariant.

### JSON config parsing (T7)
*Package: `@simtabi/cli-kit-js-config`*

- Custom `safeParse()` uses `Object.create(null)` for every object node.
- Forbidden keys (`__proto__`, `prototype`, `constructor`) rejected at any depth via pre-scan + recursive revival.
- Per-file size cap (default 1 MiB) and aggregate cap (default 4 MiB).
- File loader resolves `realpath` and rejects symlinks that escape `configDir`.
- Environment-name path-traversal guard rejects `../etc/passwd`.
- No JS / TS / YAML config files in the default loader — JSON only. JS-config loader exists as an opt-in plugin (M9+).
- `sensitive`/`secret` schema flags redact values in snapshots, logs, and `inspect()` output.
- Fuzz-tested: `Object.prototype` never polluted by arbitrary input strings.

### DOM / HTML rendering (T2)
*Packages: `@simtabi/cli-kit-js-render/html`, `@simtabi/cli-kit-js-io/dom`*

- All strings auto-escape `& < > " ' /` before reaching the DOM.
- DOM constructed via `document.createElement` + `textContent` + `setAttribute('style', …)` only. **`innerHTML` is forbidden library-wide** (Biome `noDangerouslySetInnerHtml: error` rule enforces this in CI).
- Inline `style` is the only attribute set on rendered spans (plus `data-stream="stderr"` for error rows). Values match a strict CSS allowlist:
  - `color`, `background-color`, `font-weight`, `font-style`, `text-decoration`
  - Values validated as hex (`#rrggbb`), `rgb(…)`, or named keywords pulled from the SGR mapping.
- Hyperlink schemes (when emitted) restricted to `http`, `https`, `mailto`.
- CSP-compatible: no `eval`, no `Function`, no inline scripts, no inline event handlers. Optional `cspNonce` field reserved for `style-src 'nonce-…'` deployments.
- Fuzz invariants in `render/html.test.ts` (1000+ runs each):
  1. Output never contains `<script`.
  2. Output never contains `javascript:` / `vbscript:` URLs.
  3. Output never contains `on*=` event-handler attributes.
  4. Output never contains an unescaped raw user `<` outside our own `<span>` tags.
- DOM-adapter fuzz invariant: only `style` and `data-stream` attributes ever appear on rendered spans.

### Terminal rendering (T3)
*Packages: `@simtabi/cli-kit-js-ansi`, `@simtabi/cli-kit-js-io/node`*

- Allowlist `sanitize()` strips OSC, DCS, APC, PM, SOS, CSI cursor/scroll/erase/mode-set sequences from external inputs.
- Keeps only CSI SGR (`\x1b[…m`).
- Allowlist, not denylist — anything outside the allowlist is dropped.
- Hand-walked state machine, not unbounded regex — ReDoS-safe.
- `writeRaw` exists for consumer-controlled ANSI (spinners, cursor moves) but consumers are warned that user input must be pre-sanitised before passing to `writeRaw`.
- Terminal state guard (`TerminalGuard`) restores cooked mode, cursor visibility, alternate-screen exit, SGR reset on every exit path (`exit`, SIGINT/SIGTERM/SIGHUP, `uncaughtException`, `unhandledRejection`).
- Fuzz invariants: `sanitize` output never contains non-SGR escapes; `strip` output never contains any ESC; `sanitize` is idempotent.

### Input handling — prompts (T8)
*Package: `@simtabi/cli-kit-js-prompts`*

- Prompt answers never re-rendered through `writeRaw` or unsafe paths. The renderer treats every keystroke as untrusted text.
- Password prompts render the mask character (default `*`) for each typed character; the underlying buffer is a `SecureString` (`d4a1acc`) — a Uint8Array zero-filled on `read()`, `dispose()`, and on every `popChar()` of dropped tail bytes. The mask is the only thing that ever reaches `io.writeRaw`. **Verified by test:** `password.test.ts` asserts the actual buffer never appears in `io.rawWrites`.
- `SecureString.peek()` is used for mid-prompt validation (keeps the buffer alive on failure so the user can edit); `read()` is used on accept and disposes the buffer immediately. `peek()` materialises a regular JS string — narrowing the lifetime, not eliminating it; documented as such.
- DECSC / DECRC (`\x1b7` / `\x1b8`) used to save+restore cursor around the validation-error row so stale errors never linger across redraws. (Fixed in `a18f562`.)
- Ctrl+C and Escape unconditionally throw `PromptCancelledError`; the SecureString is `dispose()`d on cancel.
- AbortSignal threads through every prompt; abort fires from outside cleanly cancel the read.

### Signal handling & lifecycle (A1)
*Package: `@simtabi/cli-kit-js-io`, `@simtabi/cli-kit-js-core`*

- `SignalController` maps SIGINT/SIGTERM/SIGHUP to a single `AbortSignal`. First signal triggers cooperative shutdown with a default 5-second timeout; a second signal hard-exits with the conventional UNIX exit code (130 / 143 / 129).
- SIGPIPE produces `process.exit(0)` — graceful broken-pipe handling.
- Hook plugins run in an isolated try/catch; a plugin throw is logged to stderr and the run continues (unless `strictPlugins: true`).
- `cleanup` always runs, even on thrown `run`.
- Exit codes documented and enforced: 0 ok, 1 runtime error, 2 usage error, 129 SIGHUP, 130 SIGINT, 143 SIGTERM.

### Sensitive data handling (A4)
*Package: `@simtabi/cli-kit-js-config`*

- Config-schema keys marked `sensitive: true` are redacted in `inspect`, `snapshot({ redactSensitive: true })`, error messages, and any logger output.
- Schema flag `secret: true` is the stronger form: refused even in non-redacted snapshots.
- Password prompts buffer locally (see Prompts section above).
- No telemetry, no update checks, no network I/O from any package in `packages/**`.

### Supply chain (T4, T5, T6)
*Repo-wide*

- **Zero external runtime dependencies.** Workspace deps (`@simtabi/cli-kit-js-*`) are the only `dependencies` permitted; the CI `no-external-runtime-deps` job rejects any PR that introduces an external dep.
- Lockfile (`pnpm-lock.yaml`) committed; `--frozen-lockfile` in every CI install step.
- **npm publication uses `--provenance` via GitHub Actions OIDC.** Configured in `release.yml`; `id-token: write` permission scoped to the release job only.
- GitHub Actions pinned to commit SHAs, not floating tags. Outstanding: the Semgrep image is pinned to the `1.99` minor tag with a comment requiring out-of-band release-note review before bumps — full SHA pin is an open follow-up.
- CodeQL `security-and-quality` queries run weekly + on every PR.
- Semgrep with `p/typescript`, `p/javascript`, `p/security-audit`, `p/owasp-top-ten` rule packs runs weekly + on every PR.
- `pnpm audit --audit-level=high` runs in CI; high/critical advisories block merge.
- `dependabot.yml` keeps GitHub Actions and pnpm catalog up to date.
- `CODEOWNERS` enforces review on security-sensitive paths.
- Branch protection (configured in GitHub Settings, not in-repo): signed commits, required reviews, required checks on `main`.
- SBOM (CycloneDX) generated on every push to `main` and on every release; attached to the GitHub Release.
- OSSF Scorecard runs weekly and publishes badge metrics.

### Reviewer-only checklists
When a PR touches any of these paths, the PR template requires the security checklist:

- `packages/parser/**`
- `packages/io/**` (especially `dom.ts`, `node.ts`, `console.ts`)
- `packages/ansi/**`
- `packages/render/html.ts`
- `packages/config/**`
- `packages/prompts/**`
- `.github/workflows/**`
- `packages/*/package.json` `dependencies` field

## Out-of-scope

- The terminal emulator's own bugs (we do not defend against compromised xterm/iTerm renderers).
- Side channels (timing, EM, acoustic) — this is not a cryptographic library.
- Adversarial hardware.
- Browser engines themselves (Chrome / Firefox / Safari).
- The JavaScript runtime's own memory safety.

## Review cadence

Reviewed at every minor release and on demand when a PR touches the paths listed above. See [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md) for the release-time runbook.
