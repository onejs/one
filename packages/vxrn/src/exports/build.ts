import FSExtra from 'fs-extra'
import { rm } from 'node:fs/promises'
import { sep } from 'node:path'
import type { OutputAsset, OutputChunk, RolldownOutput } from 'rolldown'
import {
  loadConfigFromFile,
  mergeConfig,
  build as viteBuild,
  type InlineConfig,
  type Plugin,
  type UserConfig,
} from 'vite'
import { getBaseViteConfigWithPlugins } from '../config/getBaseViteConfigWithPlugins'
import { getOptimizeDeps } from '../config/getOptimizeDeps'
import { fillOptions } from '../config/getOptionsFilled'
import { mergeUserConfig } from '../config/mergeUserConfig'
import type { BuildArgs, VXRNOptions } from '../types'
import { getServerCJSSetting, getServerEntry } from '../utils/getServerEntry'
import { applyBuiltInPatches } from '../utils/patches'
import { loadEnv } from './loadEnv'

const { existsSync } = FSExtra

Error.stackTraceLimit = Number.POSITIVE_INFINITY

const disableOptimizationConfig = {
  optimizeDeps: {},

  build: {
    minify: false,
    rolldownOptions: {
      treeshake: false,
      output: {
        minifyInternalExports: false,
      },
    },
  },
} satisfies UserConfig

export const build = async (optionsIn: VXRNOptions, buildArgs: BuildArgs = {}) => {
  process.env.IS_VXRN_CLI = 'true'

  // set NODE_ENV, do before loading vite.config (see loadConfigFromFile)
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `\n ⚠️  Warning: NODE_ENV is set to "${process.env.NODE_ENV}" (builds default to "production")\n`
    )
  }

  const skipEnv = optionsIn.skipEnv ?? false

  const [envResult, options, userViteConfig] = await Promise.all([
    skipEnv
      ? { serverEnv: {} as Record<string, string>, clientEnv: {}, clientEnvDefine: {} }
      : loadEnv('production'),
    fillOptions(optionsIn, { mode: 'prod' }),
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
    Object.entries(envResult.serverEnv).map(([key, value]) => {
      return [`process.env.${key}`, JSON.stringify(value)]
    })
  )

  await applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

  const outDir = userViteConfig?.build?.outDir ?? 'dist'

  // clean
  await Promise.all([
    (async () => {
      // lets always clean output folder for now to be sure were correct
      if (existsSync(outDir)) {
        await rm(outDir, { recursive: true, force: true })
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
        bundleOutput: `${outDir}${sep}${buildArgs.platform}.js`,
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
  const { rolldownOptions: optimizeDepsRolldownOptions, ...optimizeDepsWithoutRolldown } =
    optimizeDeps

  let webBuildConfig = mergeConfig(
    await getBaseViteConfigWithPlugins({
      ...options,
      mode: 'production',
    }),
    {
      plugins: globalThis.__vxrnAddWebPluginsProd,
      clearScreen: false,
      configFile: false,
      ...(skipEnv && { envFile: false }),
      // rolldownOptions goes on environments.client to avoid Vite compat-proxy bug
      optimizeDeps: optimizeDepsWithoutRolldown,
      environments: {
        client: {
          optimizeDeps: {
            rolldownOptions: optimizeDepsRolldownOptions,
          },
        },
      },
      logLevel: 'warn',
      build: {
        rolldownOptions: {
          // react-native packages import native-only exports (codegenNativeComponent etc.)
          // from react-native, which is aliased to react-native-web on web. react-native-web
          // doesn't export these, so rolldown would error. shimMissingExports creates
          // undefined shims instead, matching esbuild's lenient behavior.
          shimMissingExports: true,
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
              warning.message = warning.message.replace(
                /(\.+\/){0,}node_modules/,
                'node_modules'
              )
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

  const excludeAPIAndMiddlewareRoutesPlugin = {
    enforce: 'pre',
    name: 'omit-api-routes',
    transform: {
      order: 'pre',
      handler(code, id) {
        if (/\+api.tsx?$/.test(id)) {
          return ``
        }
        if (/_middleware.tsx?$/.test(id)) {
          return ``
        }
      },
    },
  } satisfies Plugin

  let clientOutput
  let clientBuildPromise: Promise<RolldownOutput> | undefined

  if (buildArgs.step !== 'generate') {
    let clientBuildConfig = mergeConfig(webBuildConfig, {
      plugins: [excludeAPIAndMiddlewareRoutesPlugin],

      define: {
        'process.env.VITE_ENVIRONMENT': '"client"',
        ...(process.env.ONE_SERVER_URL && {
          'process.env.ONE_SERVER_URL': JSON.stringify(process.env.ONE_SERVER_URL),
        }),
      },

      build: {
        ssrManifest: true,
        outDir: `${outDir}/client`,
        sourcemap: false,
        manifest: true,
        rolldownOptions: {
          input: ['virtual:one-entry'],

          output: {
            codeSplitting: {
              // merge tiny chunks to reduce HTTP requests and total chunk count
              minSize: 42_000,
            },
          },
        },
      },
    } satisfies UserConfig)

    if (process.env.VXRN_DISABLE_PROD_OPTIMIZATION) {
      clientBuildConfig = mergeConfig(clientBuildConfig, disableOptimizationConfig)
    }

    console.info(
      `\n 🔨 build ${options.build?.server !== false ? 'client + server' : 'client'}\n`
    )

    clientBuildPromise = viteBuild(clientBuildConfig) as Promise<RolldownOutput>
  }

  const serverOptions = options.build?.server
  const webConfig = (optionsIn as VXRNOptions & { web?: { deploy?: unknown } }).web
  const deployTarget =
    typeof webConfig?.deploy === 'string'
      ? webConfig.deploy
      : (webConfig?.deploy as { target?: string } | undefined)?.target
  const isCloudflareDeploy = deployTarget === 'cloudflare'

  // default to cjs
  const shouldOutputCJS = getServerCJSSetting(options)

  // unified mode: drop the blanket ssr.noExternal, keep only react inlined
  // (externalizing react broke prod builds, see commit 423b9cb0c).
  // other deps let rolldown decide — user can still add externals via
  // build.server.config.ssr.external or rolldownOptions.external.
  const isUnified =
    typeof serverOptions === 'object' && serverOptions !== null && serverOptions.unified === true

  let serverBuildConfig = mergeConfig(webBuildConfig, {
    plugins: [excludeAPIAndMiddlewareRoutesPlugin, ...globalThis.__vxrnAddWebPluginsProd],

    define: {
      'process.env.TAMAGUI_IS_SERVER': '"1"',
      'process.env.VITE_ENVIRONMENT': '"ssr"',
      ...processEnvDefines,
      ...webBuildConfig.define,
    },

    ssr: {
      ...(isCloudflareDeploy && {
        target: 'webworker',
      }),
      noExternal: isUnified ? ['react', 'react-dom'] : true,
      optimizeDeps: optimizeDepsWithoutRolldown,
    },

    environments: {
      ssr: {
        optimizeDeps: {
          rolldownOptions: optimizeDepsRolldownOptions,
        },
      },
    },

    build: {
      // we want one big file of css
      cssCodeSplit: false,
      ssr: true,
      sourcemap: false,
      outDir: `${outDir}/server`,
      rolldownOptions: {
        treeshake: true,
        // fixes some weird issues with optimizing tamagui and other packages
        // external: (id) => {
        //   if (serverExternals.has(id)) return true
        //   return false
        //   // return /^@tamagui/.test(id)
        // },

        input: ['virtual:one-entry'],

        output: {
          ...(isCloudflareDeploy && {
            codeSplitting: true,
          }),
          ...(shouldOutputCJS && {
            format: 'cjs',
            entryFileNames: '[name].cjs',
          }),
        },
      },
    },
  } satisfies UserConfig)

  if (rerouteNoExternalConfig) {
    serverBuildConfig.ssr!.noExternal = true
  }

  const serverEntry = getServerEntry(options, outDir)

  let serverOutput: [OutputChunk, ...(OutputChunk | OutputAsset)[]] | undefined
  let clientManifest
  let serverBuildPromise: Promise<RolldownOutput> | undefined

  if (serverOptions !== false) {
    if (!clientBuildPromise) {
      console.info(`\n 🔨 build server\n`)
    }

    const userServerConf = optionsIn.build?.server
    const userServerBuildConf =
      typeof userServerConf === 'boolean' ? null : userServerConf?.config

    serverBuildPromise = viteBuild(
      userServerBuildConf
        ? mergeConfig(serverBuildConfig, userServerBuildConf)
        : serverBuildConfig
    ) as Promise<RolldownOutput>
  }

  // Wait for both builds to complete in parallel
  if (clientBuildPromise && serverBuildPromise) {
    const [clientResult, serverResult] = await Promise.all([
      clientBuildPromise,
      serverBuildPromise,
    ])
    clientOutput = clientResult.output
    serverOutput = serverResult.output
  } else if (clientBuildPromise) {
    const clientResult = await clientBuildPromise
    clientOutput = clientResult.output
  } else if (serverBuildPromise) {
    const serverResult = await serverBuildPromise
    serverOutput = serverResult.output
  }

  if (serverOptions !== false) {
    clientManifest = await FSExtra.readJSON(`${outDir}/client/.vite/manifest.json`)

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
    outDir,
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
