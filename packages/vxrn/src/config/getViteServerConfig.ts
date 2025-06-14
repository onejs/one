import { mergeConfig, type InlineConfig, type UserConfig } from 'vite'

import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { mergeUserConfig } from './mergeUserConfig'

import { webExtensions } from '../constants'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getServerConfigPlugin } from '../plugins/clientInjectPlugin'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { reactNativeDevAssetPlugin } from '../plugins/reactNativeDevAssetPlugin'
import { createReactNativeDevServerPlugin } from '../plugins/reactNativeDevServer'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { applyBuiltInPatchesPlugin } from '../plugins/applyBuiltInPatchesPlugin'


export async function getViteServerConfig(config: VXRNOptionsFilled, userViteConfig?: UserConfig) {
  const { root, server } = config
  const { optimizeDeps } = getOptimizeDeps('serve')

  // TODO: can we move most of this into `one` plugin:
  let serverConfig: UserConfig = mergeConfig(
    await getBaseViteConfig('serve', config),

    {
      root,
      appType: 'custom',
      clearScreen: false,
      publicDir: 'public',
      plugins: [
        createReactNativeDevServerPlugin(config),

        getServerConfigPlugin(),

        applyBuiltInPatchesPlugin(config),

        // temp fix
        // avoid logging the optimizeDeps we add that aren't in the app:
        // likely we need a whole better solution to optimize deps
        {
          name: `avoid-optimize-logs`,

          configureServer() {
            const ogWarn = console.warn
            console.warn = (...args: any[]) => {
              if (
                typeof args[0] === 'string' &&
                args[0].startsWith(`Failed to resolve dependency:`)
              ) {
                return
              }
              return ogWarn(...args)
            }
          },
        },

        reactNativeHMRPlugin({
          ...config,
          assetExts: DEFAULT_ASSET_EXTS,
        }),

        expoManifestRequestHandlerPlugin({
          projectRoot: root,
          port: server.port,
        }),

        reactNativeDevAssetPlugin({
          projectRoot: root,
          assetExts: DEFAULT_ASSET_EXTS,
        }),
      ],

      ssr: {
        optimizeDeps,
      },

      environments: {
        client: {
          optimizeDeps: {
            include: ['react-native-screens', '@rocicorp/zero'],
            esbuildOptions: {
              resolveExtensions: webExtensions,
            },
          },
        },
      },

      optimizeDeps: {
        esbuildOptions: {
          target: 'esnext',
        },
      },

      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        cors: true,
        host: server.host,
        port: server.port,
      },
    } satisfies UserConfig
  ) satisfies InlineConfig

  const rerouteNoExternalConfig = userViteConfig?.ssr?.noExternal === true
  if (rerouteNoExternalConfig) {
    delete userViteConfig.ssr!.noExternal
  }

  // don't merge full user vite config because vite will do that since we don't disable configFile
  // because we want vite to watch the configFile for changes
  // but we need to probably avoid loading the config before vite does in the future
  // for some reason i do have to merge this partial config or else it doesnt pick up things which
  const { plugins, ...rest } = userViteConfig || {}
  const mergableUserConf = {
    ...rest,
  }

  serverConfig = mergeUserConfig(optimizeDeps, serverConfig, mergableUserConf)

  if (rerouteNoExternalConfig) {
    serverConfig.ssr!.noExternal = true
  }

  // manually merge
  if (process.env.DEBUG) {
    // console.debug('user config in:', JSON.stringify(userViteConfig, null, 2), `\n----\n`)
    console.debug('merged config:', JSON.stringify(serverConfig, null, 2), `\n----\n`)
  }

  return serverConfig
}
