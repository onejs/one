import { defineConfig } from 'vitest/config'

import defaultConfig from './vitest.config'

export default defineConfig({
  clearScreen: false,
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    globalSetup: '@vxrn/test/setup-ios',
    include: ['**/native-features.test.ios.?(c|m)[jt]s?(x)'],
    // experimental @vxrn/native tests (zoom, toolbar, menu, split-view) are
    // excluded until those components are released and registered natively
    // only one simulator device at a time
    fileParallelism: false,
    // native tests need generous timeouts
    testTimeout: 120000,
    hookTimeout: 120000,
  },
})
