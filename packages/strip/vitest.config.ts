import { defineConfig } from 'vitest/config'

// because we build things and need to use "dist" dir
// cant be parallel, we'd need to support custom out dir

export default defineConfig({
  test: {
    // globalSetup: './test/_globalSetup.ts',
    // reporters: ['hanging-process'],
    teardownTimeout: 500,
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
      },
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
    },
    exclude: process.env.CI ? ['**/*.test.ts'] : [],
  },
})
