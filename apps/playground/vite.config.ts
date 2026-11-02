import { defineConfig } from 'vite'

export default defineConfig({
  // Published inside the repository's single GitHub Pages site, under /playground/.
  base: '/cli-kit-js/playground/',
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
