# Contributing

Thanks for considering a contribution.

## Before you start

1. Read [`THREAT-MODEL.md`](./THREAT-MODEL.md). Most of our design constraints fall out of it.
2. Open an issue describing the change *before* sending a large PR. Small fixes can go straight to a PR.

## Requirements

- **Node**: 22 LTS or newer. Run `nvm use` (`.nvmrc` is set to `22`).
- **pnpm**: 9 or newer. `corepack enable && corepack prepare pnpm@latest --activate` works.

## Setup

```bash
git clone git@github.com:simtabi/cli-kit-js.git
cd cli-kit-js
pnpm install
pnpm build
pnpm test
```

## Branch & commit

- Branch from `main`. Use a short descriptive slug (`fix/parser-negative-number`, `feat/config-watch`).
- Commits follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`). `commitlint` runs in CI.
- Sign commits where you can (`git commit -S`). Required on `main` post-1.0.

## Changesets

Any change that affects published packages must include a changeset:

```bash
pnpm changeset
```

Pick the affected packages, the bump type, and write a one-line user-facing summary. The CI build fails without a changeset on package code changes.

## Tests

- `pnpm test` runs the full Vitest matrix.
- `pnpm test:watch` for local iteration.
- New behaviour requires unit tests. Security-sensitive code paths require fuzz tests (`fast-check`).
- Browser packages also need Playwright tests once `apps/playground` is wired up.

## Lint & types

- `pnpm lint` runs Biome. Fix with `pnpm lint:fix`.
- `pnpm typecheck` runs `tsc --noEmit` across the workspace.
- Both gates are required for merge.

## Dependencies

**No runtime `dependencies` may be added to any package under `packages/`.** Dev dependencies are fine; verify they do not leak into the build.

If you believe a runtime dep is genuinely necessary, open an RFC issue first. The bar is high.

## Security-sensitive changes

Touching any of the following requires a security checklist completed in the PR description:

- `packages/parser/**`
- `packages/io/**`
- `packages/ansi/**`
- `packages/ansi-html/**`
- `packages/config/**`
- `.github/workflows/**`

The checklist is in [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).

## Releasing

Release flow is automated by Changesets. A maintainer merges the auto-generated `Version Packages` PR; that triggers `release.yml` which publishes to npm with `--provenance`. Do not publish manually.
