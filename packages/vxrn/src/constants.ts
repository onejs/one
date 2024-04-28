import type { UserConfig } from 'vite'

export const DEFAULT_PORT = 8081

// TODO move to router
export const EMPTY_LOADER_STRING = `function loader() {return [][0 + 0]}`

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

const needsInterop = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-native-web-internals',
  'react-dom',
  'react-native-web',
  'react-dom/server',
  'react-dom/client',

  'url-parse',
  '@vxrn/safe-area',
  'query-string',
  'escape-string-regexp',
  'use-latest-callback',
  'react-is',
  'fast-deep-equal',
  '@react-navigation/native',
  'react-native-svg',
  '@supabase/auth-helpers-react',
  'parse-numeric-range',
  'use-sync-external-store',
  'use-sync-external-store/shim',
  'swr',
]

export const depsToOptimize = [
  ...needsInterop,
  '@vxrn/router/headers',
  'tamagui/linear-gradient',
  '@tamagui/linear-gradient',
  '@react-native/normalize-color',
  '@vxrn/router',
  'expo-modules-core',
  'expo-status-bar',
  'react-native-web',
  'react-native-web-lite',
  'react-native',
  '@tamagui/alert-dialog',
  '@tamagui/avatar',
  '@tamagui/core',
  '@tamagui/dialog',
  '@tamagui/group',
  '@tamagui/helpers-icon',
  '@tamagui/helpers',
  '@tamagui/image',
  '@tamagui/lucide-icons',
  '@tamagui/popover',
  '@tamagui/popper',
  '@tamagui/scroll-view',
  '@tamagui/select',
  '@tamagui/sheet',
  '@tamagui/switch',
  '@tamagui/tabs',
  '@tamagui/toast',
  '@tamagui/toggle-group',
  '@tamagui/tooltip',
  '@tamagui/use-window-dimensions',
  '@tamagui/web',
  'tamagui',
  'react-native-web',
  'react-native-web-lite',
  'reforest',
]

export const optimizeDeps = {
  include: depsToOptimize,
  needsInterop,
  exclude: ['util'],
  esbuildOptions: {
    resolveExtensions: webExtensions,
  },
} satisfies UserConfig['optimizeDeps']
