import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: 'https://cli-kit-js.pages.dev',
  integrations: [
    starlight({
      title: 'cli-kit-js',
      description:
        'A safe, fluent, zero-runtime-dependency CLI and rendering toolkit for Node, Deno, Bun, and the browser.',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/simtabi/cli-kit-js',
      },
      editLink: {
        baseUrl: 'https://github.com/simtabi/cli-kit-js/edit/main/docs/',
      },
      lastUpdated: true,
      pagination: true,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Getting started', slug: 'getting-started' },
          ],
        },
        {
          label: 'Concepts',
          autogenerate: { directory: 'concepts' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Packages',
          autogenerate: { directory: 'packages' },
        },
        {
          label: 'Security',
          items: [
            {
              label: 'Threat model',
              link: 'https://github.com/simtabi/cli-kit-js/blob/main/THREAT-MODEL.md',
            },
            {
              label: 'Disclosure policy',
              link: 'https://github.com/simtabi/cli-kit-js/blob/main/SECURITY.md',
            },
            {
              label: 'Release checklist',
              link: 'https://github.com/simtabi/cli-kit-js/blob/main/SECURITY-CHECKLIST.md',
            },
          ],
        },
      ],
      head: [
        // Strict CSP for the docs site itself, matching the kit's posture.
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content:
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none';",
          },
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
})
