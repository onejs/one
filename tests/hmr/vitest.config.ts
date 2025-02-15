import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    globalSetup: '@vxrn/test/setup',
    retry: 1,
    // Ensure tests run sequentially
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    // Add reasonable timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
