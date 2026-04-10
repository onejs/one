export const DEFAULT_PORT = 8081

const viteDefaultExtensions = [
  // keep indent
  '.mjs',
  '.js',
  '.ts',
  '.tsx',
  '.json',
]

export const webExtensions = [
  '.web.tsx',
  '.web.ts',
  '.web.mjs',
  '.web.js',
  ...viteDefaultExtensions,
]

export const ssrExtensions = ['.server.tsx', '.server.ts', ...webExtensions]

export const iosExtensions = [
  '.ios.tsx',
  '.ios.ts',
  '.ios.mjs',
  '.ios.js',
  '.native.tsx',
  '.native.ts',
  '.native.mjs',
  '.native.js',
  ...viteDefaultExtensions,
]

export const androidExtensions = [
  '.android.tsx',
  '.android.ts',
  '.android.mjs',
  '.android.js',
  '.native.tsx',
  '.native.ts',
  '.native.mjs',
  '.native.js',
  ...viteDefaultExtensions,
]
