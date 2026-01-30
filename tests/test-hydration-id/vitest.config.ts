import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 2,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
