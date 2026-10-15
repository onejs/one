import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  test: {
    include: ['./tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    globalSetup: './tests/setup.ts',
  },
})
