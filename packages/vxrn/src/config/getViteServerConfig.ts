import { mergeConfig, type InlineConfig, type UserConfig } from 'vite'

import { getBaseViteConfigWithPlugins } from './getBaseViteConfigWithPlugins'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { mergeUserConfig } from './mergeUserConfig'

import { getReactNativePlugins } from './getReactNativePlugins'
import { getAdditionalViteConfig } from './getAdditionalViteConfig'

/**
 * Only used in CLI mode since this hard-codes the `mode` to `'serve'` and contains
 * custom config merging logic.
 */
export async function getViteServerConfig(config: VXRNOptionsFilled, userViteConfig?: UserConfig) {
  const { root, server } = config
  const { optimizeDeps } = getOptimizeDeps('serve')

  // TODO: can we move most of this into `one` plugin:
  let serverConfig: UserConfig = mergeConfig(
    await getBaseViteConfigWithPlugins(config),

    mergeConfig(getAdditionalViteConfig(), {
      plugins: [...getReactNativePlugins(config)],
      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        host: server.host,
        port: server.port,
      },
      root,
    } satisfies UserConfig)
  ) satisfies InlineConfig

  const rerouteNoExternalConfig = userViteConfig?.ssr?.noExternal === true
  if (rerouteNoExternalConfig) {
    console.warn(`[rerouteNoExternalConfig] delete userViteConfig.ssr.noExternal`)
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
