# cli-kit-js docs site

[Astro Starlight](https://starlight.astro.build) site for `@simtabi/cli-kit-js`. Deployed to Cloudflare Pages on every merge to `main`.

## Local development

```bash
pnpm install
pnpm --filter @simtabi/cli-kit-js-docs dev
```

Site runs on `http://localhost:4321`.

## Build

```bash
pnpm --filter @simtabi/cli-kit-js-docs build
```

Static output lands in `docs/dist/` and is what Cloudflare Pages publishes.

## Content layout

```
src/content/docs/
├─ index.mdx              # landing page (splash template)
├─ getting-started.mdx
├─ concepts/
│  ├─ architecture.mdx
│  ├─ security.mdx
│  └─ naming.mdx
├─ guides/
│  ├─ build-a-cli.mdx
│  ├─ layered-config.mdx
│  ├─ browser-rendering.mdx
│  └─ writing-tests.mdx
└─ packages/
   ├─ parser.mdx
   ├─ ansi.mdx
   ├─ text.mdx
   ├─ io.mdx
   ├─ render.mdx
   ├─ config.mdx
   ├─ core.mdx
   ├─ prompts.mdx
   └─ testing.mdx
```

The Security section in the sidebar links to the canonical `THREAT-MODEL.md`, `SECURITY.md`, and `SECURITY-CHECKLIST.md` in the repo — there's a single source of truth.

## Deploy

Cloudflare Pages auto-detects Astro. Project settings:

- Build command: `pnpm --filter @simtabi/cli-kit-js-docs build`
- Build output directory: `docs/dist`
- Root directory: `/`
- Node version: 22
- Environment variable `CI=true`

The site URL is configured to `https://cli-kit-js.pages.dev` in `astro.config.mjs`. Update if the canonical domain changes.
