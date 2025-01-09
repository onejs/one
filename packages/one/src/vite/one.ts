import { configureVXRNCompilerPlugin } from '@vxrn/compiler'
import { resolvePath } from '@vxrn/resolve'
import events from 'node:events'
import path, { dirname, resolve } from 'node:path'
import type { Plugin, PluginOption, UserConfig } from 'vite'
import { barrel } from 'vite-plugin-barrel'
import tsconfigPaths from 'vite-tsconfig-paths'
import {
  autoDepOptimizePlugin,
  getOptimizeDeps,
  getOptionsFilled,
  isWebEnvironment,
  loadEnv,
} from 'vxrn'
import { CACHE_KEY } from '../constants'
import '../polyfills-server'
import { existsAsync } from '../utils/existsAsync'
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
  if (!globalThis.__oneOptions) {
    // first load we are just loading it ourselves to get the user options
    // so we can just set here and return nothing
    setOneOptions(options)
    globalThis['__vxrnPluginConfig__'] = options
    return []
  }

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

  const devAndProdPlugins: Plugin[] = [
    {
      name: 'one:config',
      // @ts-ignore
      __get: options,
    },

    barrelOption === false
      ? null
      : (barrel({
          packages: Array.isArray(barrelOption) ? barrelOption : ['@tamagui/lucide-icons'],
        }) as any),

    {
      name: 'one-define-env',
      async config() {
        const { clientEnvDefine } = await loadEnv(vxrnOptions?.mode ?? 'development')
        return {
          define: clientEnvDefine,
        }
      },
    },

    ...(options.ssr?.disableAutoDepsPreBundling === true
      ? []
      : [
          autoDepOptimizePlugin({
            onScannedDeps({ hasReanimated }) {
              configureVXRNCompilerPlugin({
                disableReanimated: !hasReanimated,
              })
            },
            root,
            exclude: Array.isArray(options.ssr?.disableAutoDepsPreBundling)
              ? options.ssr?.disableAutoDepsPreBundling
              : undefined,
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
      name: 'one-slim-deps',
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
                'import.meta.env.VITE_ENVIRONMENT': '"client"',
                'process.env.EXPO_OS': '"web"',
              },
            },

            ssr: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"ssr"',
                'import.meta.env.VITE_ENVIRONMENT': '"ssr"',
                'process.env.EXPO_OS': '"web"',
              },
            },

            ios: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"ios"',
                'import.meta.env.VITE_ENVIRONMENT': '"ios"',
                'process.env.EXPO_OS': '"ios"',
              },
            },

            android: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"android"',
                'import.meta.env.VITE_ENVIRONMENT': '"android"',
                'process.env.EXPO_OS': '"android"',
              },
            },
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'tamagui-react-19',
      config() {
        return {
          define: {
            // safe to set because it only affects web in tamagui, and one is always react 19
            'process.env.TAMAGUI_REACT_19': '"1"',
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
  ] satisfies Plugin[]

  // react scan
  const scan = options.react?.scan

  const reactScanPlugin = {
    name: `one:react-scan`,
    config() {
      return reactScanConfig
    },
  }
  devAndProdPlugins.push(reactScanPlugin)

  // do it here because it gets called a few times
  const reactScanConfig = ((): UserConfig => {
    const stringify = (obj: Object) => JSON.stringify(JSON.stringify(obj))

    const configs = {
      disabled: {
        define: {
          'process.env.ONE_ENABLE_REACT_SCAN': '""',
        },
      },
      enabled: {
        define: {
          'process.env.ONE_ENABLE_REACT_SCAN': stringify({
            enabled: true,
            animationSpeed: 'slow',
            showToolbar: false,
          }),
        },
      },
    } satisfies Record<string, UserConfig>

    const getConfigFor = (platform: 'ios' | 'android' | 'client'): UserConfig => {
      if (process.env.NODE_ENV === 'production') {
        return configs.disabled
      }
      if (!scan) {
        return configs.disabled
      }
      if (scan === true) {
        return configs.enabled
      }
      if (typeof scan === 'string') {
        if (scan === 'native' && platform === 'client') {
          return configs.disabled
        }
        if (scan === 'web' && platform !== 'client') {
          return configs.disabled
        }
        return configs.enabled
      }

      const defaultConfig = scan.options || configs.enabled
      const perPlatformConfig =
        platform === 'ios' || platform === 'android' ? scan.native : scan.web

      return {
        define: {
          'process.env.ONE_ENABLE_REACT_SCAN': stringify({
            ...defaultConfig,
            ...perPlatformConfig,
          }),
        },
      }
    }

    return {
      environments: {
        client: getConfigFor('client'),
        ios: getConfigFor('ios'),
        android: getConfigFor('android'),
      },
    }
  })()

  // TODO move to single config and through environments
  const nativeWebDevAndProdPlugsin: Plugin[] = [clientTreeShakePlugin(), reactScanPlugin]

  // TODO make this passed into vxrn through real API
  globalThis.__vxrnAddNativePlugins = nativeWebDevAndProdPlugsin
  globalThis.__vxrnAddWebPluginsProd = devAndProdPlugins

  return [
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
      root: 'app',
    }),

    {
      name: 'one-define-environment',
      config() {
        return {
          define: {
            ...(options.app?.key && {
              'process.env.ONE_APP_NAME': JSON.stringify(options.app.key),
              'import.meta.env.ONE_APP_NAME': JSON.stringify(options.app.key),
            }),

            'process.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
            'import.meta.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'one:optimize-deps-load-web-extensions-web-only',
      enforce: 'pre',

      applyToEnvironment(environment) {
        return isWebEnvironment(environment)
      },

      async resolveId(id, importer = '') {
        const shouldOptimize = optimizeIdRegex.test(importer)

        if (shouldOptimize) {
          const absolutePath = resolve(dirname(importer), id)
          const webPath = absolutePath.replace(/(.m?js)/, '') + '.web.js'
          if (webPath === id) return
          try {
            const directoryPath = absolutePath + '/index.web.js'
            if (await existsAsync(directoryPath)) {
              return directoryPath
            }
            if (await existsAsync(webPath)) {
              return webPath
            }
          } catch (err) {
            console.warn(`error probably fine`, err)
          }
        }
      },
    } satisfies Plugin,

    SSRCSSPlugin({
      entries: [virtualEntryId],
    }),
  ]
}
