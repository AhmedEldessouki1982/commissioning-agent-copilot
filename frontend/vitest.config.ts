import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Pure-logic unit tests (reducer, simulator, pulse bus, theme derivation) — no
// DOM, so the default `node` environment is used and jsdom is not required.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
