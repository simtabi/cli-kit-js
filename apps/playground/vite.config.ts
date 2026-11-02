import { defineConfig } from 'vite'

export default defineConfig({
  // Published inside the repository's single GitHub Pages site, under /playground/.
  base: '/cli-kit-js/playground/',
  build: {
    target: 'es2022',
    sourcemap: true,
    // `rollupOptions.output.manualChunks: undefined` used to sit here. Vite 8's types reject
    // an explicitly-undefined property (TS2769), and it was only ever restating the default,
    // so omitting it builds exactly the same bundle.
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
