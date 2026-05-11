# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

Run `pnpm changeset` to add an entry for any change that affects a published package. The CLI walks you through:

1. Which packages are affected.
2. Whether each is a `patch`, `minor`, or `major` bump.
3. A short user-facing summary.

Changesets are committed to this folder and consumed by CI when releasing.
