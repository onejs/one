import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    globalSetup: '@vxrn/test/setup',
  },
})
