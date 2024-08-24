import { dirname, resolve } from 'node:path'
import { type InlineConfig, type PluginOption, type UserConfig, loadConfigFromFile } from 'vite'
import { getOptimizeDeps, isWebEnvironment } from 'vxrn'
import { existsAsync } from '../utils/existsAsync'
import { requireResolve } from '../utils/requireResolve'
import { clientTreeShakePlugin } from './clientTreeShakePlugin'
import { createFileSystemRouter } from './createFileSystemRouter'
import { fixDependenciesPlugin } from './fixDependenciesPlugin'
import { loadEnv } from './loadEnv'
import type { VXS } from './types'
import { createVirtualEntry, virtualEntryId } from './virtualEntryPlugin'
import { vitePluginSsrCss } from './vitePluginSsrCss'

export function getUserVXSOptions(config: UserConfig) {
  const flatPlugins = [...(config.plugins || [])].flat(3)
  const userOptionsPlugin = flatPlugins.find((x) => x && x['name'] === 'vxs-user-options')
  return userOptions.get(userOptionsPlugin)
}

export async function loadUserVXSOptions(command: 'serve') {
  const found = await loadConfigFromFile({
    mode: 'prod',
    command,
  })
  if (!found) {
    throw new Error(`No config found`)
  }
  const foundVxsConfig = getUserVXSOptions(found.config)
  if (!foundVxsConfig) {
    throw new Error(`No VXS plugin added to config`)
  }
  return foundVxsConfig
}

const userOptions = new WeakMap<any, VXS.PluginOptions>()

export function vxs(options: VXS.PluginOptions = {}): PluginOption {
  void loadEnv(process.cwd())

  // build is superset for now
  const { optimizeDeps } = getOptimizeDeps('build')
  const optimizeIds = optimizeDeps.include
  const optimizeIdRegex = new RegExp(
    // santize ids for regex
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    `${optimizeIds.map((id) => id.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&')).join('|')}`
  )

  // weird i know
  const userOptionsPlugin = {
    name: 'vxs-user-options',
  }

  userOptions.set(userOptionsPlugin, options)

  return [
    /**
     * This is really the meat of vxs, where it handles requests:
     */
    createFileSystemRouter(options),

    clientTreeShakePlugin(),

    fixDependenciesPlugin(options.deps),

    userOptionsPlugin,

    createVirtualEntry({
      ...options,
      root: 'app',
    }),

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
    },

    // TODO only on native env
    {
      name: 'use-react-18 for native',
      enforce: 'pre',

      async config() {
        const sharedNativeConfig = {
          resolve: {
            alias: {
              react: requireResolve('vxs/react-18'),
              'react-dom': requireResolve('vxs/react-dom-18'),
            },
          },
        } satisfies InlineConfig

        return {
          environments: {
            ios: {
              ...sharedNativeConfig,
            },
            android: {
              ...sharedNativeConfig,
            },
          },
        }
      },
    },

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
    },

    vitePluginSsrCss({
      entries: [virtualEntryId],
    }),
  ]
}
