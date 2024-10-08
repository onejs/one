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

export const webExtensions = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.mjs',
  '.web.js',
  ...viteDefaultExtensions,
]
