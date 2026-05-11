# Releasing

How to cut a new version of `cli-kit-js`.

> **Always work through Changesets.** Manual `npm publish` is forbidden — the release workflow is the only path that produces npm provenance attestations.

## Day-to-day: add a changeset per PR

Every PR that touches a published package must include a changeset:

```bash
pnpm changeset
```

The CLI walks you through:

1. Which packages are affected.
2. Whether each is a `patch`, `minor`, or `major` bump.
3. A one-line user-facing summary.

Conventional Commits in the commit message body, semver in the changeset. The CI build fails without a changeset on PRs that touch package source.

## Cutting a release

1. **Merge to `main`.** All PRs land normally.
2. **Changesets opens a "Version Packages" PR** automatically. It bumps versions, rewrites `CHANGELOG.md` files, and updates internal `workspace:*` deps to the new versions.
3. **Walk [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md).** Do not merge the Version Packages PR until every item is green.
4. **Merge the Version Packages PR.** `release.yml` triggers:
   - `pnpm install --frozen-lockfile`
   - `pnpm build`
   - `pnpm test`
   - `changesets/action publish` invokes `pnpm release`, which runs `changeset publish` with `NPM_CONFIG_PROVENANCE: "true"`.
   - Each package is published to npm with an OIDC-backed provenance attestation visible on the package page.
   - A GitHub Release is created with the changelog excerpt.
5. **`sbom.yml`** fires on the release event, generates a CycloneDX SBOM, and attaches it to the GitHub Release.
6. **Tag manually** if you want a signed `vX.Y.Z` tag on the commit:

   ```bash
   git checkout main && git pull
   git tag -s vX.Y.Z -m "v X.Y.Z"
   git push --tags
   ```

   The npm publish itself is the canonical version marker; the tag is convenience for git tooling.

## What gets published

The npm-published artefacts are exactly the contents of the `dist/` folder for each `packages/*` plus that package's `README.md` and `LICENSE`. The `files` field in every package's `package.json` enforces this.

Workspace deps (`workspace:*`) are rewritten by Changesets to the matching version range at publish time. Consumers see real version pins, not the workspace protocol.

## Pre-release / beta

For `next`-tag betas:

```bash
pnpm changeset pre enter next       # opens prerelease mode
pnpm changeset                       # add changesets normally
pnpm changeset version               # produces 0.x.0-next.N
# … review, merge …
pnpm changeset pre exit              # closes prerelease mode
```

The `release.yml` workflow's `pnpm release` step (which calls `changeset publish`) automatically handles the `--tag next` flag during prerelease mode.

## Out of band

These steps live outside the CI flow:

- **NPM_TOKEN.** Add to GitHub repo Settings → Secrets → Actions. Use an [npm automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) limited to publish scope on `@simtabi/*` packages.
- **CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.** Required if you wire the docs / playground deploy workflows. Token scope: Cloudflare Pages → Edit.
- **Branch protection on `main`** in GitHub Settings → Branches:
  - Require pull request before merging.
  - Require status checks: `Lint`, `Typecheck`, `Test`, `Verify zero external runtime deps`, `Dependency audit`, `CodeQL`, `Semgrep`.
  - Require signed commits.
  - Restrict who can push to matching branches.
- **Teams** for `CODEOWNERS`: create `@simtabi/maintainers` and `@simtabi/security` teams in the org, populate them. If you don't want teams yet, replace the team handles in `.github/CODEOWNERS` with individual usernames.

## Rolling back

Don't `npm unpublish` — it's blocked by registry policy after 72 hours and is hostile to consumers anyway. Instead:

1. Publish a new patch that reverts the breaking change.
2. Mark the bad version as deprecated:

   ```bash
   npm deprecate @simtabi/cli-kit-js@X.Y.Z "use X.Y.Z+1 — bad version, see #NNN"
   ```

3. Open a GitHub Security Advisory if the issue had security implications.

## Versioning policy

- **0.x:** anything goes per release. Minor-version bumps may be breaking and will be documented in the changeset summary.
- **1.0+:** strict SemVer. Public API is the surface in each package's `dist/index.d.ts`. Breaking changes require a major bump. `@beta` / `@experimental` JSDoc tags carve out exemptions until graduation.
