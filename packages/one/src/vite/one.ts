import { resolvePath } from '@vxrn/resolve'
import events from 'node:events'
import path, { dirname, resolve } from 'node:path'
import { type Plugin, type PluginOption, type UserConfig, loadConfigFromFile } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import {
  autoPreBundleDepsForSsrPlugin,
  getOptimizeDeps,
  getOptionsFilled,
  isWebEnvironment,
  loadEnv,
} from 'vxrn'
import { CACHE_KEY } from '../constants'
import '../polyfills-server'
import { existsAsync } from '../utils/existsAsync'
import { ensureTSConfig } from './ensureTsConfig'
import { clientTreeShakePlugin } from './plugins/clientTreeShakePlugin'
import { createFileSystemRouterPlugin } from './plugins/fileSystemRouterPlugin'
import { fixDependenciesPlugin } from './plugins/fixDependenciesPlugin'
import { generateFileSystemRouteTypesPlugin } from './plugins/generateFileSystemRouteTypesPlugin'
import { createReactCompilerPlugin } from './plugins/reactCompilerPlugin'
import { SSRCSSPlugin } from './plugins/SSRCSSPlugin'
import { createVirtualEntry, virtualEntryId } from './plugins/virtualEntryPlugin'
import type { One } from './types'

events.setMaxListeners(1_000)

// temporary for tamagui plugin compat
globalThis.__vxrnEnableNativeEnv = true

export function one(options: One.PluginOptions = {}): PluginOption {
  oneOptions = options

  // ensure tsconfig
  if (options.config?.ensureTSConfig !== false) {
    void ensureTSConfig()
  }

  globalThis['__vxrnPluginConfig__'] = options

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

  const devAndProdPlugins: Plugin[] = [
    {
      name: 'one:config',
      // @ts-ignore
      __get: options,
    },

    {
      name: 'one-define-env',
      async config() {
        const { clientEnvDefine } = await loadEnv(vxrnOptions?.mode ?? 'development')
        return {
          define: clientEnvDefine,
        }
      },
    },

    ...(options.ssr?.disableAutoDepsPreBundling
      ? []
      : [
          autoPreBundleDepsForSsrPlugin({
            root,
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

        return {
          resolve: {
            alias: {
              tslib: resolvePath('@vxrn/tslib-lite', process.cwd()),
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
              },
            },

            ssr: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"ssr"',
                'import.meta.env.VITE_ENVIRONMENT': '"ssr"',
              },
            },

            ios: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"ios"',
                'import.meta.env.VITE_ENVIRONMENT': '"ios"',
              },
            },

            android: {
              define: {
                'process.env.VITE_ENVIRONMENT': '"android"',
                'import.meta.env.VITE_ENVIRONMENT': '"android"',
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

  // react compiler
  const compiler = options.react?.compiler
  if (compiler) {
    devAndProdPlugins.push(createReactCompilerPlugin(root))
  }

  // react scan
  const scan = options.react?.scan

  // TODO make this passed into vxrn through real API
  globalThis.__vxrnAddNativePlugins = [clientTreeShakePlugin()]
  globalThis.__vxrnAddWebPluginsProd = devAndProdPlugins

  return [
    ...devAndProdPlugins,

    {
      name: `one:react-scan`,
      config() {
        return {
          environments: {
            // only in client
            client: {
              define: {
                'process.env.ONE_ENABLE_REACT_SCAN': JSON.stringify(
                  typeof scan === 'boolean' ? `${scan}` : scan
                ),
              },
            },
          },
        }
      },
    },

    /**
     * This is really the meat of one, where it handles requests:
     */
    createFileSystemRouterPlugin(options),

    generateFileSystemRouteTypesPlugin(options),

    clientTreeShakePlugin(),

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
      name: 'one-use-react-18-for-native',
      enforce: 'pre',

      async config() {
        const sharedNativeConfig = {
          resolve: {
            alias: {
              react: resolvePath('one/react-18', process.cwd()),
              'react-dom': resolvePath('one/react-dom-18', process.cwd()),
            },
          },
        } satisfies UserConfig

        return {
          environments: {
            ios: {
              ...sharedNativeConfig,
            },
            android: {
              ...sharedNativeConfig,
            },
            // this started erroring for no reason..
          } as any,
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

let oneOptions: One.PluginOptions | null = null

async function getUserOneOptions(command?: 'serve' | 'build') {
  if (!oneOptions) {
    if (!command) throw new Error(`Options not loaded and no command given`)
    await loadUserOneOptions(command)
  }
  if (!oneOptions) {
    throw new Error(`No One options were loaded`)
  }
  return oneOptions
}

export async function loadUserOneOptions(command: 'serve' | 'build') {
  const found = await loadConfigFromFile({
    mode: 'prod',
    command,
  })
  if (!found) {
    throw new Error(`No config found in ${process.cwd()}. Is this the correct directory?`)
  }
  const foundOptions = getUserOneOptions()
  if (!foundOptions) {
    throw new Error(`No One plugin found in this vite.config`)
  }
  return foundOptions
}
