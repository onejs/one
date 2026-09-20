import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  define: {
    __DEV__: true,
    'process.env.ONE_PLATFORM': JSON.stringify('web'),
  },
  test: {
    setupFiles: [resolve(__dirname, 'tests/setupNativeState.ts')],
  },
  resolve: {
    conditions: ['module', 'browser', 'development|production'],
    extensions: [
      '.web.mjs',
      '.web.js',
      '.web.mts',
      '.web.ts',
      '.web.jsx',
      '.web.tsx',
      '.mjs',
      '.js',
      '.mts',
      '.ts',
      '.jsx',
      '.tsx',
      '.json',
    ],
    alias: [
      {
        // a workspace package can carry its own nested react copy, which breaks hooks in tests
        // that render through react-test-renderer, so both resolve to a single instance.
        find: /^react$/,
        replacement: resolve(__dirname, '../../node_modules/react/index.js'),
      },
      {
        find: /^react-native$/,
        replacement: resolve(
          __dirname,
          '../../node_modules/react-native-web/dist/index.js'
        ),
      },
    ],
  },
})
