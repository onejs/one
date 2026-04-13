import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 0,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
})
