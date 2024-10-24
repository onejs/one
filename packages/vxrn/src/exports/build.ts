import FSExtra from 'fs-extra'
import { rm } from 'node:fs/promises'
import type { RollupOutput } from 'rollup'
import {
  loadConfigFromFile,
  mergeConfig,
  build as viteBuild,
  type InlineConfig,
  type Plugin,
  type UserConfig,
} from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import type { BuildArgs, VXRNOptions } from '../types'
import { getBaseViteConfig } from '../utils/getBaseViteConfig'
import { getOptimizeDeps } from '../utils/getOptimizeDeps'
import { fillOptions } from '../utils/getOptionsFilled'
import { getServerCJSSetting, getServerEntry } from '../utils/getServerEntry'
import { mergeUserConfig } from '../utils/mergeUserConfig'
import { applyBuiltInPatches } from '../utils/patches'

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

export const build = async (optionsIn: VXRNOptions, buildArgs: BuildArgs = {}) => {
  // set NODE_ENV, do before loading vite.config (see loadConfigFromFile)
  process.env.NODE_ENV = 'production'

  const [options, userViteConfig] = await Promise.all([
    fillOptions(optionsIn),
    loadConfigFromFile({
      command: 'build',
      mode: 'prod',
    }).then((_) => _?.config),
  ])

  await applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

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

  const { optimizeDeps } = getOptimizeDeps('build')

  let webBuildConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'production',
      projectRoot: options.root,
    }),
    {
      plugins: globalThis.__vxrnAddWebPluginsProd,
      clearScreen: false,
      configFile: false,
      optimizeDeps,
    } satisfies InlineConfig
  )

  const rerouteNoExternalConfig = userViteConfig?.ssr?.noExternal === true
  if (rerouteNoExternalConfig) {
    delete userViteConfig.ssr!.noExternal
  }

  webBuildConfig = mergeUserConfig(optimizeDeps, webBuildConfig, userViteConfig)

  const excludeAPIRoutesPlugin = {
    enforce: 'pre',
    name: 'omit-api-routes',
    transform(code, id) {
      if (/\+api.tsx?$/.test(id)) {
        return ``
      }
    },
  } satisfies Plugin

  let clientOutput

  if (buildArgs.step !== 'generate') {
    let clientBuildConfig = mergeConfig(webBuildConfig, {
      plugins: [
        excludeAPIRoutesPlugin,
        // if an error occurs (like can't find index.html, it seems to show an
        // error saying can't find report here instead, so a bit confusing)
        process.env.VXRN_ANALYZE_BUNDLE
          ? analyzer({
              analyzerMode: 'static',
              fileName: '../report',
            })
          : null,
      ],

      define: {
        'process.env.VITE_ENVIRONMENT': '"client"',
        ...(process.env.ONE_SERVER_URL && {
          'process.env.ONE_SERVER_URL': JSON.stringify(process.env.ONE_SERVER_URL),
        }),
      },

      build: {
        ssrManifest: true,
        outDir: 'dist/client',
        manifest: true,
        rollupOptions: {
          input: ['virtual:one-entry'],

          // output: {
          //   manualChunks: {
          //     preload: ['\0vite/preload-helper.js'],
          //   },
          // },
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

  const serverOptions = options.build?.server

  // default to cjs
  const shouldOutputCJS = getServerCJSSetting(options)

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
      'process.env.VITE_ENVIRONMENT': '"server"',
      ...processEnvDefines,
      ...webBuildConfig.define,
    },

    // builder: {
    //   async buildApp(builder) {
    //     // console.warn('building??????')
    //     await builder.build(builder.environments.server)
    //   },
    // },

    ssr: {
      noExternal: true,
      external: ['react', 'react-dom'],
      optimizeDeps,
    },

    build: {
      // we want one big file of css
      cssCodeSplit: false,
      ssr: true,
      outDir: 'dist/server',
      rollupOptions: {
        treeshake: true,
        // fixes some weird issues with optimizing tamagui and other packages
        // external: (id) => {
        //   if (serverExternals.has(id)) return true
        //   return false
        //   // return /^@tamagui/.test(id)
        // },

        input: ['virtual:one-entry'],

        ...(shouldOutputCJS && {
          output: {
            format: 'cjs', // Ensure the format is set to 'cjs'
            entryFileNames: '[name].cjs', // Customize the output file extension
          },
        }),
      },
    },
  } satisfies UserConfig)

  if (rerouteNoExternalConfig) {
    serverBuildConfig.ssr!.noExternal = true
  }

  const serverEntry = getServerEntry(options)

  let serverOutput
  let clientManifest

  if (serverOptions !== false) {
    console.info(`\n 🔨 build server\n`)
    const { output } = (await viteBuild(serverBuildConfig)) as RollupOutput
    serverOutput = output
    clientManifest = await FSExtra.readJSON('dist/client/.vite/manifest.json')
  }

  return {
    options,
    buildArgs,
    serverEntry,
    clientOutput,
    serverOutput,
    serverBuildConfig,
    webBuildConfig,
    clientManifest,
  }
}
