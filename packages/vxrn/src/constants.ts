export const DEFAULT_PORT = 8081

const viteDefaultExtensions = [
  // keep indent
  '.mjs',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
]

export const nativeExtensions = [
  // keep indent
  '.native.tsx',
  '.native.ts',
  '.native.mjs',
  '.native.js',
  ...viteDefaultExtensions,
]

export const iosExtensions = [
  // keep indent
  '.ios.tsx',
  '.ios.ts',
  '.ios.mjs',
  '.ios.js',
  ...nativeExtensions,
]

export const androidExtensions = [
  // keep indent
  '.android.tsx',
  '.android.ts',
  '.android.mjs',
  '.android.js',
  ...nativeExtensions,
]

export const webExtensions = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.mjs',
  '.web.js',
  ...viteDefaultExtensions,
]
