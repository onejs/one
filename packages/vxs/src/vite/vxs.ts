import { dirname, resolve } from 'node:path'
import { version } from 'react'
import { type UserConfig, type InlineConfig, type PluginOption, loadConfigFromFile } from 'vite'
import { getOptimizeDeps, isWebEnvironment } from 'vxrn'
import { existsAsync } from '../utils/existsAsync'
import { clientTreeShakePlugin } from './clientTreeShakePlugin'
import { createFileSystemRouter } from './createFileSystemRouter'
import { loadEnv } from './loadEnv'
import type { VXS } from './types'
import { createVirtualEntry, virtualEntryId } from './virtualEntryPlugin'
import { vitePluginSsrCss } from './vitePluginSsrCss'

const userOptions = new WeakMap<any, VXS.PluginOptions>()

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

export function getUserVXSOptions(config: UserConfig) {
  const flatPlugins = [...(config.plugins || [])].flat(3)
  const userOptionsPlugin = flatPlugins.find((x) => x && x['name'] === 'vxs-user-options')
  return userOptions.get(userOptionsPlugin)
}

export function vxs(options: VXS.PluginOptions = {}): PluginOption {
  void loadEnv(process.cwd())

  if (!version.startsWith('19.')) {
    console.error(`Must be on React 19, instead found`, version)
    console.error(
      ` vxs vendors React 18 and aliases to it for native environments.
 It uses your local React for web, where it requires React 19.`
    )
    process.exit(1)
  }

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

    userOptionsPlugin,

    createVirtualEntry({
      ...options,
      root: 'app',
    }),

    {
      name: 'swap-rnw-lite-on-ssr',
      enforce: 'pre',
      transform(code, id) {
        if (this.environment.name === 'ssr') {
          if (id.endsWith('.mjs') && id.includes('tamagui/code/')) {
            return code.replaceAll(`from "react-native-web"`, `from "react-native-web-lite"`)
          }
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
              react: import.meta.resolve('vxs/react-18'),
              'react-dom': import.meta.resolve('vxs/react-dom-18'),
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
