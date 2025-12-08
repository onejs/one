import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 1,
    fileParallelism: true,
    testTimeout: 15000,
    hookTimeout: 30000,
    teardownTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
})
