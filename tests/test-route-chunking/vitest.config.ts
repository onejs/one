import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    globalSetup: '@vxrn/test/setup',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
  },
})
