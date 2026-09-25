import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// two environments: src tests run One's web router setup; tests/ covers the
// native platform surface against react-native-web with its native state setup.
const react = resolve(__dirname, '../../node_modules/react/index.js')
const reactNativeWeb = resolve(__dirname, '../../node_modules/react-native-web/dist/index.js')
const extensions = [
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
]
const define = {
  __DEV__: true,
  'process.env.ONE_PLATFORM': JSON.stringify('web'),
}

const router = {
  clearScreen: false,
  assetsInclude: ['**/*.png'],
  define,
  test: {
    name: 'one',
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
    extensions,
    // bun installs a second @react-navigation/core under @react-navigation/native.
    // two copies mean two NavigationBuilderContext instances, so a navigator
    // rendered under One's NavigationContainer fork cannot find its container.
    dedupe: ['@react-navigation/core'],
    alias: [
      {
        find: /^@react-navigation\/core$/,
        replacement: resolve(__dirname, '../../node_modules/@react-navigation/core'),
      },
      { find: /^react-native$/, replacement: reactNativeWeb },
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
        replacement: resolve(
          __dirname,
          'src/__mocks__/@react-navigation/native-stack.ts'
        ),
      },
    ],
  },
}

export default defineConfig({
  test: {
    projects: [
      router,
      {
        clearScreen: false,
        define,
        test: {
          name: 'platform',
          include: ['./tests/**/*.test.?(c|m)[jt]s?(x)'],
          setupFiles: [resolve(__dirname, 'tests/setupNativeState.ts')],
        },
        resolve: {
          conditions: ['module', 'browser', 'development|production'],
          extensions,
          alias: [
            // a nested react copy breaks hooks rendered through react-test-renderer
            { find: /^react$/, replacement: react },
            { find: /^react-native$/, replacement: reactNativeWeb },
          ],
        },
      },
    ],
  },
})
