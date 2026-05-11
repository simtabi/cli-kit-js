# Roadmap

A single ordered ledger of everything outstanding. Phases run sequentially — Phase N+1 assumes Phase N is done. Within a phase, items are roughly ordered by dependency / impact.

**Legend:** ⏳ pending · 🔒 blocked on operator action · ⏸ deferred post-1.0 · ✅ done (kept for the next person's context).

---

## Phase 0 — Pre-publish sanity (engineering verification)

Local checks. None depend on external services. Run before tagging anything.

- ⏳ **0.1** `pnpm install` clean — verify the workspace resolves with the current `package.json` set and produces a `pnpm-lock.yaml`. No external runtime deps should land in the lockfile graph except dev tools.
- ⏳ **0.2** `pnpm lint` passes (Biome).
- ⏳ **0.3** `pnpm typecheck` passes across every package.
- ⏳ **0.4** `pnpm build` succeeds for every `packages/*` (tsup produces `dist/`).
- ⏳ **0.5** `pnpm test` passes the full matrix (Node 22 on Ubuntu/macOS/Windows in CI; locally on Node 22 macOS).
- ⏳ **0.6** `pnpm -r exec -- pnpm exec size-limit` is within every per-package budget.
- ⏳ **0.7** Browser playground builds and runs locally: `pnpm --filter @simtabi/cli-kit-js-playground dev`.
- ⏳ **0.8** Docs site builds and runs locally: `pnpm --filter @simtabi/cli-kit-js-docs dev`.
- ⏳ **0.9** Example Node CLIs run end-to-end against the built dist.

Any failure in Phase 0 is a blocker for Phase 1. Fix in-place and re-run.

---

## Phase 1 — First publish (`v0.1.0`)

🔒 **Operator action required.** These are out-of-band setup tasks that live in the GitHub / npm / Cloudflare dashboards, not in code.

In the order I'd do them:

- 🔒 **1.1** Rename GitHub repo `simtabi/js-cli-kit` → `simtabi/cli-kit-js` (Settings → General → Repository name). GitHub auto-redirects the old name forever.
- 🔒 **1.2** Rename the local working directory to match (cosmetic; no code references `js-cli-kit/`).
- 🔒 **1.3** Create the two GitHub teams referenced in `CODEOWNERS`: `@simtabi/maintainers` and `@simtabi/security`. Or replace the team handles in `.github/CODEOWNERS` with individual usernames if you don't want teams yet.
- 🔒 **1.4** Add repo secrets in Settings → Secrets and variables → Actions:
  - `NPM_TOKEN` — [npm automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) scoped to publish on `@simtabi/*`.
  - `CLOUDFLARE_API_TOKEN` — Cloudflare Pages → Edit scope.
  - `CLOUDFLARE_ACCOUNT_ID` — copy from the Cloudflare dashboard URL.
- 🔒 **1.5** Create two Cloudflare Pages projects:
  - `cli-kit-js` for the docs site.
  - `cli-kit-js-playground` for the browser playground.
- 🔒 **1.6** Configure branch protection on `main`:
  - Require pull request before merging.
  - Require status checks: `Lint`, `Typecheck`, `Test`, `Verify zero external runtime deps`, `Dependency audit`, `CodeQL`, `Semgrep`, `Size Limit`.
  - Require signed commits.
  - Restrict who can push to matching branches.
- 🔒 **1.7** Open and review the auto-generated *Version Packages* PR from Changesets (the `initial-release.md` changeset already exists).
- 🔒 **1.8** Walk every box in [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md). Do not merge until every item is green.
- 🔒 **1.9** Merge the *Version Packages* PR. `release.yml` publishes all nine packages to npm with provenance attestations; `sbom.yml` attaches a CycloneDX SBOM to the GitHub Release.
- 🔒 **1.10** Smoke-install in a clean directory: `npm i @simtabi/cli-kit-js@0.1.0` and run the bundled example. Verify the npm package page shows the verified-provenance badge.

---

## Phase 2 — Post-0.1.0 polish (engineering)

Once 0.1.0 ships, the kit is usable but not yet "best-of-class for v1.0". These improvements pay off in adoption.

- ⏳ **2.1** **Performance benchmarks.** Use `mitata` or `tinybench` in a new `bench/` directory. Targets:
  - parser: 10k argv tokens / sec parsed.
  - text/width: 1k Unicode strings / sec measured.
  - render/box: 100 large boxes / sec rendered.
  - ansi-html conversion: 1k SGR runs / sec.

  Wire to CI as a non-blocking informational job that posts a comment with the deltas.

- ⏳ **2.2** **More example CLIs.** Beyond the four landing in Phase 0, add:
  - A `init` scaffolder using `text` + `select` prompts to generate a starter project.
  - A `log-tail` that exercises streaming output + spinner + box for status framing.
  - A `migrate` that uses lifecycle hooks (`before:run` / `cleanup`) for transactional flow.

- ⏳ **2.3** **typedoc API reference.** Generate per-package API docs under `docs/src/content/docs/api/` from each package's `dist/index.d.ts`. Wire into the Starlight sidebar.

- ⏳ **2.4** **Comparison page.** "cli-kit-js vs. citty / commander / yargs / clack" in `docs/src/content/docs/concepts/comparison.mdx`. Honest, including where the others are better.

- ⏳ **2.5** **Logger improvements.** Currently `core` ships a thin logger. Promote it: structured fields, leveled output (silent/error/warn/info/debug/trace), secret-key auto-redaction by pattern match (`password|token|secret|key|authorization`), per-stream output (console vs file via consumer-supplied sink).

- ⏳ **2.6** **Hyperlink rendering (OSC 8).** Most modern terminals render `\x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\` as clickable. Already detected (`capabilities.hyperlinks`). Add `render.link(text, url)` that emits the sequence when capable, falls back to `text (url)` otherwise. URL allowlist: `http`, `https`, `mailto`.

- ⏳ **2.7** **Color-blindness / a11y mode.** A `output.theme` config field selecting a high-contrast palette and ASCII symbols fallback. Surfaces through `IOAdapter.capabilities` for renderers to consult.

---

## Phase 3 — M7: Browser-interactive prompts

⏸ Deferred from v1 plan when M6 landed. The `cursorMoves` capability flag (`d4a1acc`) already exists to make this addable without API churn.

- ⏳ **3.1** **DOM-specific prompt rendering strategy** that doesn't rely on cursor moves. Two options:
  - Repaint-on-keystroke: clear a dedicated sub-mount element and re-render the whole prompt. Simple, jarring on long lists.
  - Diff-and-patch: keep a DOM reference for each line and only update changed children. More complex but seamless.

  Recommended: start with repaint-on-keystroke; revisit if UX feedback warrants.

- ⏳ **3.2** **Wire each prompt to check `io.capabilities.cursorMoves`** and branch to TTY or DOM rendering.

- ⏳ **3.3** **Playground demo** showing a working prompt in the browser. Update `apps/playground/src/main.ts`.

- ⏳ **3.4** **Tests** using `DomAdapter` + JSDOM, scripting `keydown` events to drive each prompt.

---

## Phase 4 — Supply chain hardening

- ⏳ **4.1** **SHA-pin the Semgrep container image** in `.github/workflows/semgrep.yml`. Currently uses `semgrep/semgrep:1.99` minor tag. Resolve the digest from the registry, replace the tag with `semgrep/semgrep@sha256:…`. Add a comment requiring out-of-band review for digest bumps; Dependabot can raise the PR.

- ⏳ **4.2** **Sigstore release signing.** Use `actions/attest-build-provenance` to additionally produce a Sigstore-signed attestation for each release tarball. npm provenance covers most of the trust path; Sigstore is the air-gapped fallback.

- ⏳ **4.3** **Reproducible-build verification.** Add a CI job that runs `pnpm pack` twice on the same commit and asserts the resulting tarballs are byte-identical. Fails on any toolchain-introduced non-determinism.

- ⏳ **4.4** **OpenSSF Allstar enrollment.** Drop-in policy scanner that posts issues for missing best practices. Free, low effort.

---

## Phase 5 — Toward `v1.0`

Once the kit has seen real use and any 0.x feedback has been incorporated.

- ⏳ **5.1** **`api-extractor` wiring.** Detect breaking changes in every published package's `dist/index.d.ts`. CI gate that fails any PR that changes the public surface without a matching `major` changeset.

- ⏳ **5.2** **Migration guide** for any breaking changes accumulated across 0.x.

- ⏳ **5.3** **Audit-log ring buffer for `config.set()`.** Toggleable via `audit: true` in `CreateConfigOptions`. Captures caller, timestamp, prev/next values. Bounded ring (default 1000 entries).

- ⏳ **5.4** **Final external security audit** before tagging 1.0. Independent review of `THREAT-MODEL.md` plus the surfaces it enumerates.

- ⏳ **5.5** **Reach OSSF Scorecard ≥ 9** (currently aiming for ≥ 8).

- ⏳ **5.6** **Tag `v1.0.0`** through the standard release flow. Update `RELEASING.md` versioning policy with the API-stability commitment.

---

## Phase 6 — Beyond v1

Speculative; revisited when there's user demand.

- ⏸ **6.1** **xterm.js bridge** as an optional peer dep for full raw-mode terminal emulation in the browser. ~150 KB peer; consumers pull it only if they want VT100-level fidelity.

- ⏸ **6.2** **Shell completion generators.** `cli-kit-js completion bash|zsh|fish|pwsh` produces a completion script derived from the command tree. Quoting must defeat injection — adversarial command names get their own fuzz suite.

- ⏸ **6.3** **Real terminal emulator in `io/dom`.** Parse cursor-movement escapes (CUP / CUU / CUD / CUF / CUB / ED / EL) and update the DOM accordingly. Turns the DOM adapter into a tiny VT100; obviates the `cursorMoves: false` fallback. Significant scope.

- ⏸ **6.4** **i18n catalogue.** All built-in strings (help labels, error messages) become keyed lookups. Default catalogue is English; consumers ship their own.

- ⏸ **6.5** **Async generator command results.** Long-running commands can `yield` lines that the renderer streams in real time. Useful for `log-tail`, `watch`, `migrate` flows.

- ⏸ **6.6** **Plugin marketplace.** A curated index of community plugins (telemetry, auto-update, prompt themes). Lives in a separate repo `cli-kit-plugins`.

---

## Open follow-ups index

Cross-referenced from [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md#open-follow-ups):

| Item                                   | Phase | Status      |
| -------------------------------------- | ----- | ----------- |
| Semgrep image SHA pin                  | 4.1   | ⏳ pending  |
| Sigstore release signing               | 4.2   | ⏳ pending  |
| Reproducible-build verification        | 4.3   | ⏳ pending  |
| Browser-interactive prompts            | 3     | ⏸ deferred |
| Audit-log ring buffer for `config`     | 5.3   | ⏳ pending  |
| api-extractor 1.0 freeze enforcement   | 5.1   | ⏳ pending  |
| `SecureString` for password buffers    | —     | ✅ done (`d4a1acc`) |
| `cursorMoves` capability flag          | —     | ✅ done (`d4a1acc`) |
| Validation-error redraw fix in prompts | —     | ✅ done (`a18f562`) |

---

## How to use this document

- Before each work session, scan Phase 0 first — any failure there blocks downstream phases.
- When closing an item, change `⏳` → `✅` and add the commit SHA. Leave closed items in place for context (the document is a ledger, not a queue).
- When opening a new follow-up that doesn't fit an existing phase, add a phase or sub-bullet rather than pushing into an unrelated section.
- Cross-reference commits and PRs by SHA / number; don't restate work the commit message already documents.
