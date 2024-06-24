import FSExtra from 'fs-extra'
import { rm } from 'node:fs/promises'
import type { RollupOutput } from 'rollup'
import {
  loadConfigFromFile,
  mergeConfig,
  build as viteBuild,
  type Plugin,
  type UserConfig,
} from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import type { BuildArgs, VXRNConfig } from '../types'
import { getBaseViteConfig } from '../utils/getBaseViteConfig'
import { getOptimizeDeps } from '../utils/getOptimizeDeps'
import { getOptionsFilled } from '../utils/getOptionsFilled'

const { existsSync } = FSExtra

Error.stackTraceLimit = Number.POSITIVE_INFINITY

const disableOptimizationConfig = {
  optimizeDeps: {
    esbuildOptions: {
      minify: false,
    },
  },

  build: {
    minify: false,
    rollupOptions: {
      treeshake: false,
      output: {
        minifyInternalExports: false,
      },
    },
  },
} satisfies UserConfig

export const build = async (optionsIn: VXRNConfig, buildArgs: BuildArgs = {}) => {
  const [options, viteConfig] = await Promise.all([
    getOptionsFilled(optionsIn),
    loadConfigFromFile({
      command: 'build',
      mode: 'prod',
    }).then((_) => _?.config),
  ])

  // clean
  await Promise.all([
    (async () => {
      // lets always clean dist folder for now to be sure were correct
      if (existsSync('dist')) {
        await rm('dist', { recursive: true, force: true })
      }
    })(),
    (async () => {
      // lets always clean dist folder for now to be sure were correct
      if (existsSync('node_modules/.vite')) {
        await rm('node_modules/.vite', { recursive: true, force: true })
      }
    })(),
  ])

  // TODO?
  process.env.NODE_ENV = 'production'

  const { optimizeDeps } = getOptimizeDeps('build')

  let webBuildConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'production',
    }),
    {
      clearScreen: false,
      optimizeDeps,
    } satisfies UserConfig
  )

  const excludeAPIRoutesPlugin = {
    enforce: 'pre',
    name: 'omit-api-routes',
    transform(code, id) {
      if (/\+api.tsx?$/.test(id)) {
        return ``
      }
    },
  } satisfies Plugin

  if (viteConfig) {
    webBuildConfig = mergeConfig(webBuildConfig, viteConfig) as any
  }

  let clientOutput

  if (buildArgs.step !== 'generate') {
    let clientBuildConfig = mergeConfig(webBuildConfig, {
      plugins: [
        excludeAPIRoutesPlugin,
        // if an error occurs (like can't find index.html, it seems to show an
        // error saying can't find report here instead, so a bit confusing)
        buildArgs.analyze
          ? analyzer({
              analyzerMode: 'static',
              fileName: '../report',
            })
          : null,
      ],

      build: {
        ssrManifest: true,
        outDir: 'dist/client',
        manifest: true,
        rollupOptions: {
          input: ['virtual:vxs-entry'],
        },
      },
    } satisfies UserConfig)

    if (process.env.VXRN_DISABLE_PROD_OPTIMIZATION) {
      clientBuildConfig = mergeConfig(clientBuildConfig, disableOptimizationConfig)
    }

    console.info(`\n 🔨 build client\n`)
    const { output } = (await viteBuild(clientBuildConfig)) as RollupOutput
    clientOutput = output
  }

  console.info(`\n 🔨 build server\n`)

  // servers can get all the defines
  const processEnvDefines = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => {
      return [`process.env.${key}`, JSON.stringify(value)]
    })
  )

  let serverBuildConfig = mergeConfig(webBuildConfig, {
    plugins: [excludeAPIRoutesPlugin],

    define: {
      'process.env.TAMAGUI_IS_SERVER': '"1"',
      ...processEnvDefines,
      ...webBuildConfig.define,
    },

    ssr: {
      noExternal: optimizeDeps.include,
      optimizeDeps,
    },

    build: {
      // we want one big file of css
      cssCodeSplit: false,
      ssr: true,
      outDir: 'dist/server',
      rollupOptions: {
        external: [],
        input: ['virtual:vxs-entry'],
      },
    },
  } satisfies UserConfig)

  // if (process.env.VXRN_DISABLE_PROD_OPTIMIZATION) {
  //   serverBuildConfig = mergeConfig(serverBuildConfig, disableOptimizationConfig)
  // }

  const { output: serverOutput } = (await viteBuild(serverBuildConfig)) as RollupOutput
  const clientManifest = await FSExtra.readJSON('dist/client/.vite/manifest.json')

  console.info(`\n ✔️ vxrn build complete\n`)

  return {
    options,
    buildArgs,
    clientOutput,
    serverOutput,
    webBuildConfig,
    clientManifest,
  }
}
