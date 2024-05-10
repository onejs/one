import { resolve as importMetaResolve } from 'import-meta-resolve'
import type { RollupOutput } from 'rollup'
import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'
import type { VXRNConfig } from '../types'
import { getBaseViteConfig } from '../utils/getBaseViteConfig'
import { getOptimizeDeps } from '../utils/getOptimizeDeps'
import { getOptionsFilled } from '../utils/getOptionsFilled'

Error.stackTraceLimit = Infinity

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

type BuildOptions = { step?: string; page?: string }

export const build = async (optionsIn: VXRNConfig, buildOptions: BuildOptions = {}) => {
  const options = await getOptionsFilled(optionsIn)

  // TODO?
  process.env.NODE_ENV = 'production'

  const { optimizeDeps } = getOptimizeDeps('build')

  let webBuildConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'production',
    }),
    {
      root: options.root,
      clearScreen: false,
      optimizeDeps,
    } satisfies UserConfig
  )

  if (options.webConfig) {
    webBuildConfig = mergeConfig(webBuildConfig, options.webConfig) as any
  }

  if (buildOptions.step !== 'generate') {
    await viteBuild(
      mergeConfig(webBuildConfig, {
        build: {
          ssrManifest: true,
          minify: false,
          outDir: 'dist/client',
        },
      } satisfies UserConfig)
    )
  }

  console.info(`build server`)
  const { output } = (await viteBuild(
    mergeConfig(webBuildConfig, {
      ssr: {
        noExternal: optimizeDeps.include,
        optimizeDeps,
      },

      build: {
        // we want one big file of css
        cssCodeSplit: false,
        ssr: 'src/entry-server.tsx',
        outDir: 'dist/server',
        rollupOptions: {
          external: [],
        },
      },
    } satisfies UserConfig)
  )) as RollupOutput

  if (options.afterBuild) {
    await options.afterBuild(options, output)
  }
}
