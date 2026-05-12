# Release-time security checklist

A runbook for maintainers and auditors. Walk every item before tagging a release that publishes to npm.

## Pre-release (every minor)

- [ ] `pnpm install --frozen-lockfile` resolves with no warnings.
- [ ] `pnpm audit --audit-level=high --prod` returns clean.
- [ ] `pnpm lint` returns clean (Biome).
- [ ] `pnpm typecheck` returns clean across the workspace.
- [ ] `pnpm test` passes the full matrix (Node 22 on Ubuntu/macOS/Windows).
- [ ] `pnpm -r exec -- pnpm exec size-limit` is within every per-package budget.
- [ ] Fast-check fuzz runs (parser, ansi/sanitize, render/html, io/dom) all pass at their declared `numRuns` count.
- [ ] CodeQL latest run is green.
- [ ] Semgrep latest run is green; no new high-severity findings.
- [ ] OSSF Scorecard score is ≥ 8 (best practice; investigate any drop).

## Threat-model review

- [ ] Any PR in this release touched `packages/{parser,io,ansi,render/html,config,prompts}/**` — if so, [`THREAT-MODEL.md`](./THREAT-MODEL.md) reviewed and the "Last review" line updated.
- [ ] Any PR added or modified a public input surface (parser flag, config field type, prompt variant, IOAdapter method) — corresponding fuzz invariant added or updated.
- [ ] No new runtime `dependencies` field entries outside `@simtabi/cli-kit-js-*`.

## Supply-chain

- [ ] Every entry in `.github/workflows/**` either pins to a commit SHA or is a `simtabi/*` action we own. Exceptions documented in the workflow comment.
- [ ] `pnpm-lock.yaml` diff is reviewable: every new transitive dep audited.
- [ ] SBOM workflow produced a CycloneDX manifest for the previous release.
- [ ] No package gained a `postinstall`, `preinstall`, or `prepare` script unless explicitly required (none currently).
- [ ] `publishConfig.provenance: true` still set on every published package.

## Release

- [ ] Merge the auto-generated *Version Packages* PR from Changesets.
- [ ] `release.yml` published with `--provenance` (check the npm package page for the verified provenance badge).
- [ ] Verify the published tarball matches `pnpm pack` locally (deterministic content).
- [ ] `git tag -s vX.Y.Z` (signed) pushed.
- [ ] GitHub Release published with:
  - changelog excerpt
  - CycloneDX SBOM attached
  - SHA-256 of every tarball

## Post-release

- [ ] Smoke-install in a clean directory: `npm i @simtabi/cli-kit-js@latest` and run the meta-package's exports through a smoke script.
- [ ] Browser smoke: load the playground deploy on Cloudflare Pages and confirm the demo renders.
- [ ] Update the cli-kit-family README if a sibling repo (`cli-kit-py`, etc.) needs to reference the new JS version.

## On vulnerability disclosure

Use [`SECURITY.md`](./SECURITY.md) for the receiving end. When a report is accepted:

1. Acknowledge to the reporter within **3 business days**.
2. Reproduce on a fresh checkout. Document scope: which packages, which versions, which adversary class from [`THREAT-MODEL.md`](./THREAT-MODEL.md).
3. Patch on a private branch. Add a fuzz test or regression test that fails without the fix.
4. Coordinate disclosure under a **90-day embargo** by default. Shorter if active exploitation is reported.
5. Publish the patched versions via the standard release flow above.
6. Publish a GitHub Security Advisory in the same window. Credit the reporter unless they decline.
7. Update [`THREAT-MODEL.md`](./THREAT-MODEL.md) with the new defence and link the advisory.

## Closed follow-ups

- ✅ `SecureString` wrapper for password-prompt buffers (`d4a1acc`). Uint8Array-backed, zero-filled on read/dispose. Exported from `@simtabi/cli-kit-js-prompts`.
- ✅ `cursorMoves` capability flag on `IOAdapter.capabilities` (`d4a1acc`). Enables future browser-interactive prompts without API churn.
- ✅ Full SHA-pin for the Semgrep container image. Now `semgrep/semgrep@sha256:ae27024c…` resolved from Docker Hub registry. Workflow comments document the curl/manifest lookup for tag bumps; Dependabot raises the PR.
- ✅ Reproducible-build verification CI. `.github/workflows/reproducible-build.yml` builds twice with pinned `TZ=UTC` / `LANG=C.UTF-8`, SHA-256s every emitted artefact, and fails on any difference.
- ✅ API freeze enforcement via `api-extractor`. Per-package `etc/<name>.api.md` reports committed; `pnpm api:check` CI gate fails any PR that changes the public surface without an updated report + matching changeset.
- ✅ Audit-log ring buffer for `config.set()`. `audit: true` on `CreateConfigOptions` enables bounded ring (`auditCapacity` default 1000) of `{ at, op, path, previous, next }`. Sensitive paths redacted to `[REDACTED]` at capture.

## Open follow-ups

These are tracked for future hardening but not blockers for any specific release:

- Sigstore key-signing for releases (in addition to npm provenance). Phase 4.2.
- Browser-side prompts: arrow-key navigation in DOM adapter, optionally an xterm.js bridge. `cursorMoves: false` is already wired. Phase 3.
- OpenSSF Allstar enrollment. Phase 4.4.
- Migration guide for any breaking changes accumulated across 0.x. Phase 5.2.
- Final external security audit before tagging 1.0. Phase 5.4.
- Reach OSSF Scorecard ≥ 9 (currently aiming for ≥ 8). Phase 5.5.
