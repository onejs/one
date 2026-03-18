import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    globalSetup: './setup.ts',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
})
