import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  define: {
    __DEV__: true,
    'process.env.EXPO_OS': JSON.stringify('web'),
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
        find: /^react-native$/,
        replacement: resolve(
          __dirname,
          '../../node_modules/react-native-web/dist/index.js'
        ),
      },
    ],
  },
})
