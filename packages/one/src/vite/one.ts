import { clearCompilerCache, configureVXRNCompilerPlugin } from '@vxrn/compiler'
import { resolvePath } from '@vxrn/resolve'
import events from 'node:events'
import path from 'node:path'
import type { Plugin, PluginOption, UserConfig } from 'vite'
import { barrel } from 'vite-plugin-barrel'
import tsconfigPaths from 'vite-tsconfig-paths'
import { autoDepOptimizePlugin, getOptimizeDeps, getOptionsFilled, loadEnv } from 'vxrn'
import vxrnVitePlugin from 'vxrn/vite-plugin'
import { CACHE_KEY } from '../constants'
import '../polyfills-server'
import { getRouterRootFromOneOptions } from '../utils/getRouterRootFromOneOptions'
import { ensureTSConfig } from './ensureTsConfig'
import { setOneOptions } from './loadConfig'
import { clientTreeShakePlugin } from './plugins/clientTreeShakePlugin'
import { createFileSystemRouterPlugin } from './plugins/fileSystemRouterPlugin'
import { fixDependenciesPlugin } from './plugins/fixDependenciesPlugin'
import { generateFileSystemRouteTypesPlugin } from './plugins/generateFileSystemRouteTypesPlugin'
import { SSRCSSPlugin } from './plugins/SSRCSSPlugin'
import { virtualEntryId } from './plugins/virtualEntryConstants'
import { createVirtualEntry } from './plugins/virtualEntryPlugin'
import type { One } from './types'
import type {
  ExpoManifestRequestHandlerPluginPluginOptions,
  MetroPluginOptions,
} from '@vxrn/vite-plugin-metro'
import { getViteMetroPluginOptions } from '../metro-config/getViteMetroPluginOptions'

type MetroOptions = MetroPluginOptions

/**
 * This needs a big refactor!
 * I guess these plugins are all being loaded by native??
 * At least the react compiler plugin is applying to native, so the entire premise of some things
 * here are wrong. we can probably refactor and merge all the stuff
 */

events.setMaxListeners(1_000)

// temporary for tamagui plugin compat
globalThis.__vxrnEnableNativeEnv = true

// temporary until we fix double-load issue, which means we'd have to somehow
// not control the port/host from our config, but still pass it into ENV
// until then we want to avoid double loading everything on first start

export function one(options: One.PluginOptions = {}): PluginOption {
  const routerRoot = getRouterRootFromOneOptions(options)

  /**
   * A non-null value means that we are going to use Metro.
   */
  const metroOptions: (MetroOptions & ExpoManifestRequestHandlerPluginPluginOptions) | null =
    (() => {
      if (options.native?.bundler !== 'metro' && !process.env.ONE_METRO_MODE) return null

      if (process.env.ONE_METRO_MODE) {
        console.info('ONE_METRO_MODE environment variable is set, enabling Metro mode')
      }

      const routerRoot = getRouterRootFromOneOptions(options)

      const defaultMetroOptions = getViteMetroPluginOptions({
        projectRoot: process.cwd(), // TODO: hard-coded process.cwd(), we should make this optional since the plugin can have a default to vite's `config.root`.
        relativeRouterRoot: routerRoot,
        ignoredRouteFiles: options.router?.ignoredRouteFiles,
        userDefaultConfigOverrides: (options.native?.bundlerOptions as any)?.defaultConfigOverrides,
      })

      const userMetroOptions = options.native?.bundlerOptions as typeof defaultMetroOptions

      // TODO: [METRO-OPTIONS-MERGING] We only do shallow merge here.
      return {
        ...defaultMetroOptions,
        ...userMetroOptions,
        defaultConfigOverrides: defaultMetroOptions?.defaultConfigOverrides, // defaultConfigOverrides is merged by getViteMetroPluginOptions, so we need to set it here again.
        argv: {
          ...defaultMetroOptions?.argv,
          ...userMetroOptions?.argv,
        },
        babelConfig: {
          ...defaultMetroOptions?.babelConfig,
          ...userMetroOptions?.babelConfig,
        },
        mainModuleName: 'one/metro-entry', // So users won't need to write `"main": "one/metro-entry"` in their `package.json` like ordinary Expo apps.
      }
    })()

  const vxrnPlugins: PluginOption[] = []

  if (!process.env.IS_VXRN_CLI) {
    console.warn('Experimental: running VxRN as a Vite plugin. This is not yet stable.')
    vxrnPlugins.push(
      vxrnVitePlugin({
        metro: metroOptions,
      })
    )
  } else {
    if (!globalThis.__oneOptions) {
      // first load we are just loading it ourselves to get the user options
      // so we can just set here and return nothing
      setOneOptions(options)
      globalThis['__vxrnPluginConfig__'] = options
      globalThis['__vxrnMetroOptions__'] = metroOptions
      return []
    }
  }

  clearCompilerCache()

  // ensure tsconfig
  if (options.config?.ensureTSConfig !== false) {
    void ensureTSConfig()
  }

  // build is superset for now
  const { optimizeDeps } = getOptimizeDeps('build')
  const optimizeIds = optimizeDeps.include
  const optimizeIdRegex = new RegExp(
    // santize ids for regex
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    `${optimizeIds.map((id) => id.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&')).join('|')}`
  )

  let tsConfigPathsPlugin: Plugin | null = null

  const vxrnOptions = getOptionsFilled()
  const root = vxrnOptions?.root || process.cwd()
  const barrelOption = options.optimization?.barrel

  const compiler = options.react?.compiler
  if (compiler) {
    configureVXRNCompilerPlugin({
      enableCompiler:
        compiler === 'native' ? ['ios', 'android'] : compiler === 'web' ? ['ssr', 'client'] : true,
    })
  }

  const autoDepsOptions = options.ssr?.autoDepsOptimization

  const devAndProdPlugins: Plugin[] = [
    {
      name: 'one:config',
      // @ts-ignore
      __get: options,
    },

    !barrelOption
      ? null
      : (barrel({
          packages: Array.isArray(barrelOption) ? barrelOption : ['@tamagui/lucide-icons'],
        }) as any),

    {
      name: 'one-define-client-env',
      async config(userConfig) {
        const { clientEnvDefine } = await loadEnv(
          vxrnOptions?.mode ?? 'development',
          process.cwd(),
          userConfig?.envPrefix
        )
        return {
          define: clientEnvDefine,
        }
      },
    },

    ...(autoDepsOptions === false
      ? []
      : [
          autoDepOptimizePlugin({
            onScannedDeps({ hasReanimated, hasNativewind }) {
              configureVXRNCompilerPlugin({
                enableReanimated: hasReanimated,
                enableNativeCSS: options.native?.css ?? hasNativewind,
                enableNativewind: hasNativewind,
              })
            },
            root,
            include: /node_modules/,
            ...(autoDepsOptions === true ? {} : autoDepsOptions),
          }),
        ]),

    // proxy because you cant add a plugin inside a plugin
    new Proxy(
      {
        name: 'one:tsconfig-paths',
        config(configIncoming) {
          const pathsConfig = options.config?.tsConfigPaths
          if (pathsConfig === false) {
            return
          }
          if (
            configIncoming.plugins
              ?.flat()
              .some((p) => p && (p as any)['name'] === 'vite-tsconfig-paths')
          ) {
            // already has it configured
            return
          }

          tsConfigPathsPlugin = tsconfigPaths(
            pathsConfig && typeof pathsConfig === 'object' ? pathsConfig : {}
          )
        },

        configResolved() {},
        resolveId() {},
      },
      {
        get(target, key, thisArg) {
          if (key === 'config' || key === 'name') {
            return Reflect.get(target, key, thisArg)
          }

          if (tsConfigPathsPlugin) {
            return Reflect.get(tsConfigPathsPlugin, key, thisArg)
          }
        },
      }
    ),

    {
      name: 'one-aliases',
      enforce: 'pre',

      config() {
        // const forkPath = dirname(resolvePath('one'))

        let tslibLitePath = ''

        try {
          // temp fix for seeing
          // Could not read from file: modules/@vxrn/resolve/dist/esm/@vxrn/tslib-lite
          tslibLitePath = resolvePath('@vxrn/tslib-lite', process.cwd())
        } catch (err) {
          console.info(`Can't find tslib-lite, falling back to tslib`)
          if (process.env.DEBUG) {
            console.error(err)
          }
        }

        return {
          resolve: {
            alias: {
              // testing getting transition between routes working
              // 'use-sync-external-store/with-selector': resolvePath(
              //   'use-sync-external-store/shim/with-selector'
              // ),

              ...(tslibLitePath && {
                tslib: tslibLitePath,
              }),
            },

            // [
            //   {
            //     find: /tslib/,
            //     replacement: resolvePath('@vxrn/tslib-lite'),
            //   },
            //   // not working but would save ~30Kb stat
            //   // {
            //   //   find: /@react-navigation\/core.*\/getStateFromPath/,
            //   //   replacement: join(forkPath, 'fork', 'getStateFromPath.mjs'),
            //   // },
            //   // {
            //   //   find: /@react-navigation\/core.*\/getPathFromState/,
            //   //   replacement: join(forkPath, 'fork', 'getPathFromState.mjs'),
            //   // },
            // ],
          },
        }
      },
    },

    {
      name: 'one:init-config',

      config() {
        return {
          define: {
            ...(options.web?.defaultRenderMode && {
              'process.env.ONE_DEFAULT_RENDER_MODE': JSON.stringify(options.web.defaultRenderMode),
              'import.meta.env.ONE_DEFAULT_RENDER_MODE': JSON.stringify(
                options.web.defaultRenderMode
              ),
            }),

            ...(options.setupFile && {
              'process.env.ONE_SETUP_FILE': JSON.stringify(options.setupFile),
            }),

            ...(process.env.NODE_ENV !== 'production' &&
              vxrnOptions && {
                'process.env.ONE_SERVER_URL': JSON.stringify(vxrnOptions.server.url),
                'import.meta.env.ONE_SERVER_URL': JSON.stringify(vxrnOptions.server.url),
              }),
          },

          environments: {
            client: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"client"',
                'process.env.TAMAGUI_ENVIRONMENT': '"client"',
                'import.meta.env.VITE_ENVIRONMENT': '"client"',
                'process.env.EXPO_OS': '"web"',
              },
            },

            ssr: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"ssr"', // Note that we are also setting `process.env.VITE_ENVIRONMENT = 'ssr'` for this current process. See `setServerGlobals()` and `setupServerGlobals.ts`.
                'process.env.TAMAGUI_ENVIRONMENT': '"ssr"',
                'import.meta.env.VITE_ENVIRONMENT': '"ssr"',
                'process.env.EXPO_OS': '"web"',
              },
            },

            ios: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"ios"',
                'process.env.TAMAGUI_ENVIRONMENT': '"ios"',
                'import.meta.env.VITE_ENVIRONMENT': '"ios"',
                'process.env.EXPO_OS': '"ios"',
              },
            },

            android: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"android"',
                'process.env.TAMAGUI_ENVIRONMENT': '"android"',
                'import.meta.env.VITE_ENVIRONMENT': '"android"',
                'process.env.EXPO_OS': '"android"',
              },
            },
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'one:tamagui',
      config() {
        return {
          define: {
            // safe to set because it only affects web in tamagui, and one is always react 19
            'process.env.TAMAGUI_REACT_19': '"1"',
          },

          environments: {
            ssr: {
              define: {
                'process.env.TAMAGUI_IS_SERVER': '"1"',
                'process.env.TAMAGUI_KEEP_THEMES': '"1"',
              },
            },
            ios: {
              define: {
                'process.env.TAMAGUI_KEEP_THEMES': '"1"',
              },
            },
            android: {
              define: {
                'process.env.TAMAGUI_KEEP_THEMES': '"1"',
              },
            },
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'route-module-hmr-fix',
      hotUpdate({ server, modules }) {
        return modules.map((m) => {
          const { id } = m
          if (!id) return m

          const relativePath = path.relative(server.config.root, id)
          // Get the root dir from relativePath
          const rootDir = relativePath.split(path.sep)[0]
          if (rootDir === 'app') {
            // If the file is a route, Vite might force a full-reload due to that file not being imported by any other modules (`!node.importers.size`) (see https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/server/hmr.ts#L440-L443, https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/server/hmr.ts#L427 and https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/server/hmr.ts#L557-L566)
            // Here we trick Vite to skip that check.
            m.acceptedHmrExports = new Set()
          }

          return m
        })
      },
    } satisfies Plugin,

    // Plugins may transform the source code and add imports of `react/jsx-dev-runtime`, which won't be discovered by Vite's initial `scanImports` since the implementation is using ESbuild where such plugins are not executed.
    // Thus, if the project has a valid `react/jsx-dev-runtime` import, we tell Vite to optimize it, so Vite won't only discover it on the next page load and trigger a full reload.
    {
      name: 'one:optimize-dev-deps',

      config(_, env) {
        if (env.mode === 'development') {
          return {
            optimizeDeps: {
              include: ['react/jsx-dev-runtime', 'react/compiler-runtime'],
            },
          }
        }
      },
    } satisfies Plugin,

    {
      name: 'one:remove-server-from-client',
      enforce: 'pre',

      transform(code, id) {
        if (this.environment.name === 'client') {
          if (id.includes(`one-server-only`)) {
            return code.replace(
              `import { AsyncLocalStorage } from "node:async_hooks"`,
              `class AsyncLocalStorage {}`
            )
          }
        }
      },
    },
  ] satisfies Plugin[]

  // leaving this as a good example of an option that loads a library conditionally
  // // react scan
  // const scan = options.react?.scan

  // const reactScanPlugin = {
  //   name: `one:react-scan`,
  //   config() {
  //     return reactScanConfig
  //   },
  // }
  // devAndProdPlugins.push(reactScanPlugin)

  // // do it here because it gets called a few times
  // const reactScanConfig = ((): UserConfig => {
  //   const stringify = (obj: Object) => JSON.stringify(JSON.stringify(obj))

  //   const configs = {
  //     disabled: {
  //       define: {
  //         'process.env.ONE_ENABLE_REACT_SCAN': '""',
  //       },
  //     },
  //     enabled: {
  //       define: {
  //         'process.env.ONE_ENABLE_REACT_SCAN': stringify({
  //           enabled: true,
  //           animationSpeed: 'slow',
  //           showToolbar: false,
  //         }),
  //       },
  //     },
  //   } satisfies Record<string, UserConfig>

  //   const getConfigFor = (platform: 'ios' | 'android' | 'client'): UserConfig => {
  //     if (process.env.NODE_ENV === 'production') {
  //       return configs.disabled
  //     }
  //     if (!scan) {
  //       return configs.disabled
  //     }
  //     if (scan === true) {
  //       return configs.enabled
  //     }
  //     if (typeof scan === 'string') {
  //       if (scan === 'native' && platform === 'client') {
  //         return configs.disabled
  //       }
  //       if (scan === 'web' && platform !== 'client') {
  //         return configs.disabled
  //       }
  //       return configs.enabled
  //     }

  //     const defaultConfig = scan.options || configs.enabled
  //     const perPlatformConfig =
  //       platform === 'ios' || platform === 'android' ? scan.native : scan.web

  //     return {
  //       define: {
  //         'process.env.ONE_ENABLE_REACT_SCAN': stringify({
  //           ...defaultConfig,
  //           ...perPlatformConfig,
  //         }),
  //       },
  //     }
  //   }

  //   return {
  //     environments: {
  //       client: getConfigFor('client'),
  //       ios: getConfigFor('ios'),
  //       android: getConfigFor('android'),
  //     },
  //   }
  // })()

  // TODO move to single config and through environments
  const nativeWebDevAndProdPlugsin: Plugin[] = [
    clientTreeShakePlugin(),
    //
    // reactScanPlugin
  ]

  // TODO make this passed into vxrn through real API
  globalThis.__vxrnAddNativePlugins = nativeWebDevAndProdPlugsin
  globalThis.__vxrnAddWebPluginsProd = devAndProdPlugins

  const flags: One.Flags = {
    experimentalPreventLayoutRemounting: options.router?.experimental?.preventLayoutRemounting,
  }

  return [
    ...vxrnPlugins,
    ...devAndProdPlugins,
    ...nativeWebDevAndProdPlugsin,

    /**
     * This is really the meat of one, where it handles requests:
     */
    createFileSystemRouterPlugin(options),

    generateFileSystemRouteTypesPlugin(options),

    fixDependenciesPlugin(options.deps),

    createVirtualEntry({
      ...options,
      flags,
      root: routerRoot,
    }),

    {
      name: 'one-define-environment',
      config() {
        return {
          define: {
            ...(options.native?.key && {
              'process.env.ONE_APP_NAME': JSON.stringify(options.native.key),
              'import.meta.env.ONE_APP_NAME': JSON.stringify(options.native.key),
            }),

            'process.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
            'import.meta.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
          },
        }
      },
    } satisfies Plugin,

    SSRCSSPlugin({
      entries: [virtualEntryId],
    }),
  ]
}
