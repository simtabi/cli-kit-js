# OpenSSF Allstar configuration

Allstar is the OpenSSF policy enforcer that opens an issue on this repo when
a security best practice slips. The configs in this directory turn on the
policies we care about.

## Activating

1. Install the GitHub App: https://github.com/apps/allstar-app
2. Grant it `simtabi/cli-kit-js` (read-only on most scopes, except issues).
3. Wait for the first scan. Failures appear as labelled issues.

## Policies enabled

| File | Policy | Action on violation |
|---|---|---|
| `allstar.yaml` | Repository-level opt-in | — |
| `branch_protection.yaml` | Required reviews, signed commits, status checks | Open issue |
| `binary_artifacts.yaml` | Reject committed binaries | Open issue |
| `outside.yaml` | Block outside-collab push/admin | Open issue |
| `security.yaml` | Require `SECURITY.md` + private vuln disclosure | Open issue |

`action: issue` is the soft enforcement mode — Allstar opens / updates an
issue but never modifies repo settings. We trust the maintainer to follow
up. Switch to `action: fix` only if you want Allstar to auto-correct
settings.

## Updating

When the policy set changes, edit the relevant `*.yaml`. Allstar re-reads
on every scan; no app re-install needed.
