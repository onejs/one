import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    // Ensure tests run sequentially
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Add reasonable timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
