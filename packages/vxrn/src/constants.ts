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
