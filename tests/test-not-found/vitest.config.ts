import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 2,
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    maxConcurrency: 3,
  },
})
