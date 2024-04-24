import type { SSROptions } from 'vite'

export const DEFAULT_PORT = 8081

export const depsToOptimize = [
  '@react-native/normalize-color',
  // '@react-navigation/core',
  // '@react-navigation/native',
  '@vxrn/router',
  'expo-modules-core',
  'expo-status-bar',
  // 'react',
  // 'react/jsx-dev-runtime',
  // 'react/jsx-runtime',
  // 'react-dom',
  // 'react-dom/server',
  // 'react-dom/client',
  // 'react-dom/server',
  // 'react-native-safe-area-context',
  'react-native-web',
  'react-native-web-lite',
  'react-native',
]

export const needsInterop = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-native-web-internals',
  'react-dom',
  'react-native-web',
  // '@vxrn/router',
  // '@vxrn/router/render',
  'react-dom/server',
  'react-dom/client',
]

export const ssrDepsToOptimize = [
  ...new Set([
    'react-native-web',
    'react-native-web-lite',
    '@tamagui/sheet',
    '@tamagui/dialog',
    '@tamagui/alert-dialog',
    '@tamagui/image',
    '@tamagui/avatar',
    '@tamagui/group',
    '@tamagui/popper',
    '@tamagui/popover',
    '@tamagui/scroll-view',
    '@tamagui/select',
    '@tamagui/switch',
    '@tamagui/tabs',
    '@tamagui/toggle-group',
    '@tamagui/tooltip',
    '@tamagui/use-window-dimensions',
    'reforest',
    ...depsToOptimize,
    ...needsInterop,
  ]),
]

export const nativeExtensions = [
  '.native.tsx',
  '.native.jsx',
  '.native.js',
  '.tsx',
  '.ts',
  '.js',
  '.css',
  '.json',
]

export const webExtensions = [
  '.web.tsx',
  '.tsx',
  '.web.ts',
  '.ts',
  '.web.jsx',
  '.jsx',
  '.web.js',
  '.web.mjs',
  '.mjs',
  '.js',
  '.css',
  '.json',
]

export const ssrOptimizeDeps = {
  include: ssrDepsToOptimize,
  extensions: webExtensions,
  needsInterop,
  esbuildOptions: {
    resolveExtensions: webExtensions,
  },
} satisfies SSROptions['optimizeDeps']
