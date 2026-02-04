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
    fileParallelism: false,
    maxConcurrency: 3,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
})
