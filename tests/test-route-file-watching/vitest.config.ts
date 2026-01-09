import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    globalSetup: '@vxrn/test/setup',
    retry: 1,
    // Ensure tests run sequentially
    fileParallelism: false,
    // Add reasonable timeouts for CI
    testTimeout: 60000,
    hookTimeout: 60000,
  },
})
