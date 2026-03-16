import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 2,
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
  },
})
