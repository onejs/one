import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  clearScreen: false,
  assetsInclude: ['**/*.png'],
  define: {
    __DEV__: true,
    'process.env.EXPO_OS': JSON.stringify('web'),
  },
  test: {
    include: ['./src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    server: {
      deps: {
        inline: [
          '@react-navigation/core',
          '@react-navigation/elements',
          '@react-navigation/native',
          '@react-navigation/routers',
          'react-native-safe-area-context',
          'react-native-web',
        ],
      },
    },
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
        replacement: resolve(__dirname, '../../node_modules/react-native-web/dist/index.js'),
      },
      {
        find: /^react-native-safe-area-context$/,
        replacement: resolve(
          __dirname,
          '../../node_modules/react-native-safe-area-context/lib/module/index.js'
        ),
      },
      {
        find: 'react-native-screens',
        replacement: resolve(__dirname, 'src/__mocks__/react-native-screens.ts'),
      },
      {
        find: '@react-navigation/native-stack',
        replacement: resolve(__dirname, 'src/__mocks__/@react-navigation/native-stack.ts'),
      },
      {
        find: 'expo-modules-core',
        replacement: resolve(__dirname, 'src/__mocks__/expo-modules-core.ts'),
      },
      {
        find: 'expo-linking',
        replacement: resolve(__dirname, 'src/__mocks__/expo-linking.ts'),
      },
    ],
  },
})
