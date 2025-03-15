import { defineConfig } from 'vitest/config'

import defaultConfig from './vitest.config'

export default defineConfig({
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    globalSetup: '@vxrn/test/setup-ios',
    include: ['**/*.{test.\ios,spec.\ios}.?(c|m)[jt]s?(x)'],
  },
})
