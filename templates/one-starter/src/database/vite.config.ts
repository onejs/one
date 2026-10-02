import path from 'node:path'
import { defineConfig } from 'vite'
export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, '..'),
    },
  },
  build: {
    outDir: '.',
    target: 'node22',
    minify: false,
    lib: {
      name: 'migrate',
      formats: ['es'],
      entry: './migrate.ts',
    },
    rollupOptions: {
      external: ['pg', 'start', /^node:/],
      output: {
        format: 'es',
        inlineDynamicImports: true,
        exports: 'named',
        // output into the same folder to avoid import.meta and dirname issues
        entryFileNames: 'migrate-dist.js',
      },
    },
  },
})
