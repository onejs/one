import { mergeConfig, type InlineConfig, type UserConfig } from 'vite'

import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { mergeUserConfig } from './mergeUserConfig'

import { webExtensions } from '../constants'
import { getReactNativePlugins } from './getReactNativePlugins'

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
      plugins: [...getReactNativePlugins(config)],

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
