# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x     | ✅ (pre-release, latest only) |

Once we reach `1.0.0`, this table will list the two most recent minor versions.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email reports to **security@simtabi.com** with:

1. A description of the issue and its impact.
2. Steps to reproduce, ideally with a minimal proof-of-concept.
3. Affected version(s).
4. Your name and affiliation if you would like credit.

We acknowledge reports within **3 business days** and aim to ship a fix within **30 days** for high-severity issues. We coordinate disclosure with reporters on a **90-day embargo** by default; we may negotiate a shorter or longer window depending on severity and exploitation status.

If you do not receive a reply within 5 business days, please follow up.

## Scope

In scope:

- Code in `packages/**` published to npm under `@simtabi/cli-kit-js-*` or `@simtabi/cli-kit-js`.
- Build and release tooling that ships artefacts to consumers.

Out of scope:

- Example apps under `apps/examples/**`.
- The legacy snapshot in `legacy/**`.
- Vulnerabilities in development-only dependencies (please report upstream).

## Threat Model

See [THREAT-MODEL.md](./THREAT-MODEL.md) for the assets, adversaries, and defenses we explicitly consider in design and review.

## Hardening Defaults

The library ships with the following safety defaults that should not be relaxed without an audit trail:

- All consumer-supplied strings are HTML-escaped before reaching the DOM.
- Terminal escape sequences are sanitised through an allowlist (SGR only).
- No `eval`, no `Function`, no `innerHTML`, no inline event handlers.
- Zero runtime dependencies.
- Frozen module exports.
- Prototype-pollution-safe parsing.

## Disclosure Credits

Once we have shipped 1.0.0 we will list reporters who chose to be credited here.
