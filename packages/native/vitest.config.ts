import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  clearScreen: false,
  define: {
    __DEV__: true,
    'process.env.EXPO_OS': JSON.stringify('web'),
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
    alias: {
      'react-native': resolve(
        __dirname,
        '../../node_modules/react-native-web/dist/index.js'
      ),
    },
  },
})
