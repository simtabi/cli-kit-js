<!-- Thanks for the PR. Fill out the sections that apply. -->

## Summary

<!-- One paragraph: what changes, and why. -->

## Type

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor / cleanup
- [ ] Docs
- [ ] Security
- [ ] Build / CI / tooling

## Changeset

- [ ] I ran `pnpm changeset` (or this change does not affect any published package).

## Tests

- [ ] Unit tests cover the new / changed behaviour.
- [ ] If security-sensitive: fuzz tests added or updated.

## Security checklist (required if touching `parser`, `io`, `ansi`, `ansi-html`, `config`, or workflows)

- [ ] No new runtime `dependencies` introduced.
- [ ] No `innerHTML`, `eval`, `Function`, or inline event handlers added.
- [ ] All consumer-supplied strings flow through the existing sanitiser.
- [ ] Threat-model updated if surfaces or assets changed.
- [ ] Property/fuzz tests added for new external input paths.

## Breaking changes

- [ ] None
- [ ] Yes — described above, with migration notes in the changeset.
