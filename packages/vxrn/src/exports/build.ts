import FSExtra from 'fs-extra'
import { rm } from 'node:fs/promises'
import { sep } from 'node:path'
import type { OutputAsset, OutputChunk, RollupOutput } from 'rollup'
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
import { getBaseViteConfig } from '../config/getBaseViteConfig'
import { getOptimizeDeps } from '../config/getOptimizeDeps'
import { fillOptions } from '../config/getOptionsFilled'
import { getServerCJSSetting, getServerEntry } from '../utils/getServerEntry'
import { mergeUserConfig } from '../config/mergeUserConfig'
import { applyBuiltInPatches } from '../utils/patches'
import { loadEnv } from './loadEnv'

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

  // TODO WHY ISNT THIS BEING SHAKEN FROM dist/server/_virtual_one-entry.js
  // @ts-ignore
  process.env.ONE_ENABLE_REACT_SCAN = ''

  const [{ serverEnv }, options, userViteConfig] = await Promise.all([
    loadEnv('production'),
    fillOptions(optionsIn),
    loadConfigFromFile({
      command: 'build',
      mode: 'prod',
    }).then((_) => _?.config),
  ])

  if (!process.env.ONE_SERVER_URL) {
    console.warn(
      `⚠️ No ONE_SERVER_URL environment set, set it in your .env to your target deploy URL`
    )
  }

  // const externalRegex = buildRegexExcludingDeps(optimizeDeps.include)
  const processEnvDefines = Object.fromEntries(
    Object.entries(serverEnv).map(([key, value]) => {
      return [`process.env.${key}`, JSON.stringify(value)]
    })
  )

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

  if (buildArgs.platform === 'ios' || buildArgs.platform === 'android') {
    const { buildBundle } = await import('../rn-commands/bundle/buildBundle')

    return buildBundle(
      [],
      { root: options.root },
      {
        platform: buildArgs.platform,
        bundleOutput: `dist${sep}${buildArgs.platform}.js`,
        dev: false,
        entryFile: '',
        resetCache: true,
        resetGlobalCache: true,
        sourcemapUseAbsolutePath: true,
        verbose: false,
        unstableTransformProfile: '',
      }
    )
  }

  const { optimizeDeps } = getOptimizeDeps('build')

  let webBuildConfig = mergeConfig(
    await getBaseViteConfig('build', {
      ...options,
      mode: 'production',
    }),
    {
      plugins: globalThis.__vxrnAddWebPluginsProd,
      clearScreen: false,
      configFile: false,
      optimizeDeps,
      logLevel: 'warn',
      build: {
        rollupOptions: {
          onwarn(warning, defaultHandler) {
            if (
              warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
              warning.message.includes('use client')
            ) {
              return
            }

            // TODO: temp until we fix sourcemap issues!
            if (
              warning.code === 'SOURCEMAP_ERROR' &&
              warning.message.includes(`Can't resolve original location of error.`)
            ) {
              return
            }

            if (warning.code === 'EVAL') {
              warning.message = warning.message.replace(/(\.+\/){0,}node_modules/, 'node_modules')
            }

            if (warning.code === 'INVALID_ANNOTATION') {
              return
            }

            defaultHandler(warning)
          },
        },
      },
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
    transform: {
      order: 'pre',
      handler(code, id) {
        if (/\+api.tsx?$/.test(id)) {
          return ``
        }
      },
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
        sourcemap: false,
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

  let serverBuildConfig = mergeConfig(webBuildConfig, {
    plugins: [excludeAPIRoutesPlugin, ...globalThis.__vxrnAddWebPluginsProd],

    define: {
      'process.env.TAMAGUI_IS_SERVER': '"1"',
      'process.env.VITE_ENVIRONMENT': '"server"',
      ...processEnvDefines,
      ...webBuildConfig.define,
    },

    ssr: {
      noExternal: true,
      // we used to do this i think to make our patching react work?
      // but stopped working for prod builds due to duplicate react somehow
      // external: ['react', 'react-dom', 'expo-modules-core'],
      optimizeDeps,
    },

    build: {
      // we want one big file of css
      cssCodeSplit: false,
      ssr: true,
      sourcemap: false,
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

  let serverOutput: [OutputChunk, ...(OutputChunk | OutputAsset)[]] | undefined
  let clientManifest

  if (serverOptions !== false) {
    console.info(`\n 🔨 build server\n`)

    const userServerConf = optionsIn.build?.server
    const userServerBuildConf = typeof userServerConf === 'boolean' ? null : userServerConf?.config

    const { output } = (await viteBuild(
      userServerBuildConf ? mergeConfig(serverBuildConfig, userServerBuildConf) : serverBuildConfig
    )) as RollupOutput

    serverOutput = output

    clientManifest = await FSExtra.readJSON('dist/client/.vite/manifest.json')

    // temp fix - react native web is importing non-existent react 19 apis
    const old = await FSExtra.readFile(serverEntry, 'utf-8')
    await FSExtra.writeFile(
      serverEntry,
      old
        .replace(
          `import { hydrate as hydrate$1, unmountComponentAtNode, render as render$1 } from "react-dom";`,
          ''
        )
        .replace(
          `import ReactDOM__default, { render as render$2, unmountComponentAtNode as unmountComponentAtNode$1, hydrate as hydrate$1 } from "react-dom";`,
          'import ReactDOM__default from "react-dom";'
        )
    )
  }

  return {
    processEnvDefines,
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
