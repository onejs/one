import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    globalSetup: '@vxrn/test/setup',
    retry: 1,
    fileParallelism: false,
  },
})
