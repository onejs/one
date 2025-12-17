import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
    retry: 1,
    ...(() => {
      const routerRoot = process.env.ONE_ROUTER_ROOT
      if (!routerRoot) {
        return {
          exclude: [...configDefaults.exclude, 'app-cases/**'],
        }
      }

      const appCaseDir = routerRoot.replace(/\/app$/, '')
      console.info(`Testing app case ${appCaseDir}...`)

      const testsDir = appCaseDir + '/tests'

      return {
        include: [`${testsDir}/**/*.{test,spec}.?(c|m)[jt]s?(x)`],
        exclude: configDefaults.exclude,
      }
    })(),
    // Ensure tests run sequentially
    fileParallelism: false,
    // Add reasonable timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
  },

  // Need this because the default mode for testing will be 'test'.
  // This does not work, we are using [WR-B3ATY2VK] instead.
  // mode: process.env.TEST_ENV.startsWith('prod') ? 'production' : 'development',
})
