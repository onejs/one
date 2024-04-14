import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'

import { resolve as importMetaResolve } from 'import-meta-resolve'
import type { VXRNConfig } from './types'
import { getBaseViteConfig } from './utils/getBaseViteConfig'
import { getOptionsFilled } from './utils/getOptionsFilled'

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

const extensions = [
  '.web.tsx',
  '.tsx',
  '.web.ts',
  '.ts',
  '.web.jsx',
  '.jsx',
  '.web.js',
  '.js',
  '.css',
  '.json',
]

export const build = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn)
  const depsToOptimize = ['react', 'react-dom', '@react-native/normalize-color']

  let buildConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'development',
    }),
    {
      root: options.root,
      clearScreen: false,
      optimizeDeps: {
        include: depsToOptimize,
        force: true,
        esbuildOptions: {
          resolveExtensions: extensions,
        },
      },
    }
  ) satisfies UserConfig

  if (options.webConfig) {
    buildConfig = mergeConfig(buildConfig, options.webConfig) as any
  }

  console.info(`build client`)
  await viteBuild({
    ...buildConfig,
    build: {
      ...buildConfig.build,
      ssrManifest: true,
      outDir: 'dist/client',
    },
  })

  console.info(`build server`)
  await viteBuild({
    ...buildConfig,
    build: {
      ...buildConfig.build,
      ssr: 'src/entry-server.tsx',
      outDir: 'dist/server',
    },
  })
}
