import events from 'node:events'
import { dirname, resolve } from 'node:path'
import { type Plugin, type PluginOption, type UserConfig, loadConfigFromFile } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { getOptimizeDeps, isWebEnvironment } from 'vxrn'
import '../polyfills-server'
import { existsAsync } from '../utils/existsAsync'
import { requireResolve } from '../utils/requireResolve'
import { clientTreeShakePlugin } from './clientTreeShakePlugin'
import { createFileSystemRouter } from './createFileSystemRouter'
import { fixDependenciesPlugin } from './fixDependenciesPlugin'
import { generateTypesForRoutes } from './generateTypesForRoutes'
import { loadEnv } from './loadEnv'
import type { VXS } from './types'
import { createVirtualEntry, virtualEntryId } from './virtualEntryPlugin'
import { vitePluginSsrCss } from './vitePluginSsrCss'

events.setMaxListeners(1_000)

export function vxs(options: VXS.PluginOptions = {}): PluginOption {
  vxsOptions = options

  void loadEnv(process.cwd())

  globalThis['__vxrnPluginConfig__'] = options

  // build is superset for now
  const { optimizeDeps } = getOptimizeDeps('build')
  const optimizeIds = optimizeDeps.include
  const optimizeIdRegex = new RegExp(
    // santize ids for regex
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    `${optimizeIds.map((id) => id.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&')).join('|')}`
  )

  // TODO make this passed into vxrn through real API
  globalThis.__vxrnAddNativePlugins = [clientTreeShakePlugin()]

  return [
    ...(process.env.VXS_TSCONFIG_PATHS
      ? [tsconfigPaths({ projects: process.env.VXS_TSCONFIG_PATHS.split(',') })]
      : []),

    {
      name: 'vxs:init-config',

      config() {
        return {
          define: {
            ...(options.web?.defaultRenderMode && {
              'process.env.VXS_DEFAULT_RENDER_MODE': JSON.stringify(options.web.defaultRenderMode),
            }),

            ...(options.setupFile && {
              'process.env.VXS_SETUP_FILE': JSON.stringify(options.setupFile),
            }),
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'one-zero',
      config() {
        if (!options.zero) {
          return
        }

        return {
          define: {
            'process.env.ZERO_ENABLED': 'true',
            TESTING: 'false',
            REPLICACHE_VERSION: '"15.2.1"',
            ZERO_VERSION: '"0.0.0"',
          },
        }
      },
    } satisfies Plugin,

    /**
     * This is really the meat of vxs, where it handles requests:
     */
    createFileSystemRouter(options),

    generateTypesForRoutes(options),

    clientTreeShakePlugin(),

    fixDependenciesPlugin(options.deps),

    createVirtualEntry({
      ...options,
      root: 'app',
    }),

    {
      name: 'tamagui-react-19',
      config() {
        return {
          define: {
            // safe to set because it only affects web in tamagui, and vxs is always react 19
            'process.env.TAMAGUI_REACT_19': '"1"',
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'define-app-key',
      config() {
        if (!options.app?.key) {
          return
        }

        return {
          define: {
            'process.env.VXS_APP_NAME': JSON.stringify(options.app.key),
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'use-react-18-for-native',
      enforce: 'pre',

      async config() {
        const sharedNativeConfig = {
          resolve: {
            alias: {
              react: requireResolve('vxs/react-18'),
              'react-dom': requireResolve('vxs/react-dom-18'),
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
      name: 'optimize-deps-load-web-extensions',
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

    vitePluginSsrCss({
      entries: [virtualEntryId],
    }),
  ]
}

let vxsOptions: VXS.PluginOptions | null = null

async function getUserVXSOptions(command?: 'serve' | 'build') {
  if (!vxsOptions) {
    if (!command) throw new Error(`Options not loaded and no command given`)
    await loadUserVXSOptions(command)
  }
  if (!vxsOptions) {
    throw new Error(`No vxs options loaded`)
  }
  return vxsOptions
}

export async function loadUserVXSOptions(command: 'serve' | 'build') {
  const found = await loadConfigFromFile({
    mode: 'prod',
    command,
  })
  if (!found) {
    throw new Error(`No config found`)
  }
  const foundVxsConfig = getUserVXSOptions()
  if (!foundVxsConfig) {
    throw new Error(`No VXS plugin added to config`)
  }
  return foundVxsConfig
}
