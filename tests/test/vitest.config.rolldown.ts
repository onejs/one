import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 1,
    ...(() => {
      const routerRoot = process.env.ONE_ROUTER_ROOT
      if (!routerRoot) {
        return {
          exclude: ['app-cases/**'],
        }
      }

      const appCaseDir = routerRoot.replace(/\/app$/, '')
      console.info(`Testing app case ${appCaseDir}...`)

      const testsDir = appCaseDir + '/tests'

      return {
        include: [`${testsDir}/**/*.{test,spec}.?(c|m)[jt]s?(x)`],
      }
    })(),
    // Ensure tests run sequentially
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Add reasonable timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})