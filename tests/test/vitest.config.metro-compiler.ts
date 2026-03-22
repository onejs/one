import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    include: ['tests/metro-compiler.test.ts'],
    testTimeout: 300000,
    hookTimeout: 300000,
  },
})
