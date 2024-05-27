import { mergeConfig, type InlineConfig, type UserConfig } from 'vite'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { coerceToArray } from './coerceToArray'
import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNConfigFilled } from './getOptionsFilled'
import { uniq } from './uniq'

export async function getViteServerConfig(config: VXRNConfigFilled) {
  const { root, host } = config
  const { optimizeDeps } = getOptimizeDeps('serve')

  let serverConfig: UserConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'development',
    }),
    {
      root,
      clearScreen: false,
      plugins: [
        reactNativeHMRPlugin(config),

        {
          name: 'process-env-ssr',
          transform(code, id, options) {
            if (id.includes('node_modules')) return
            if (code.includes('process.env.TAMAGUI_IS_SERVER')) {
              return code.replaceAll('process.env.TAMAGUI_IS_SERVER', `${!!options?.ssr}`)
            }
          },
        },
      ],

      optimizeDeps,

      ssr: {
        optimizeDeps,
      },

      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        cors: true,
        host,
      },
    } satisfies UserConfig
  ) satisfies InlineConfig

  let webConfig = config.webConfig || {}

  if (webConfig) {
    serverConfig = mergeConfig(serverConfig, webConfig) as any
  }

  if (serverConfig.ssr?.noExternal && !Array.isArray(serverConfig.ssr?.noExternal)) {
    throw new Error(`ssr.noExternal must be array`)
  }

  // vite doesnt merge arrays but we want that

  serverConfig.ssr ||= {}
  serverConfig.ssr.optimizeDeps ||= {}

  webConfig.ssr ||= {}
  webConfig.ssr.optimizeDeps ||= {}

  serverConfig.ssr.noExternal = uniq([
    ...coerceToArray((serverConfig.ssr?.noExternal as string[]) || []),
    ...(serverConfig.ssr?.optimizeDeps.include || []),
    ...(webConfig.ssr?.optimizeDeps.include || []),
    ...coerceToArray(webConfig.ssr?.noExternal || []),
    ...optimizeDeps.include,
    'react',
    'react-dom',
    'react-dom/server',
    'react-dom/client',
  ])

  serverConfig.ssr.optimizeDeps.exclude = uniq([
    ...(serverConfig.ssr?.optimizeDeps.exclude || []),
    ...(webConfig.ssr?.optimizeDeps.exclude || []),
    ...optimizeDeps.exclude,
  ])

  serverConfig.ssr.optimizeDeps.include = uniq([
    ...(serverConfig.ssr?.optimizeDeps.include || []),
    ...(webConfig.ssr?.optimizeDeps.include || []),
    ...optimizeDeps.include,
  ])

  serverConfig.ssr.optimizeDeps.needsInterop = uniq([
    ...(serverConfig.ssr?.optimizeDeps.needsInterop || []),
    ...(webConfig.ssr?.optimizeDeps.needsInterop || []),
    ...optimizeDeps.needsInterop,
  ])

  serverConfig.ssr.optimizeDeps.esbuildOptions = {
    ...(serverConfig.ssr?.optimizeDeps.esbuildOptions || {}),
    ...(webConfig.ssr?.optimizeDeps.esbuildOptions || {}),
    ...optimizeDeps.esbuildOptions,
  }

  // manually merge
  if (process.env.DEBUG) {
    console.debug('user config is', JSON.stringify(webConfig, null, 2))
    console.debug('server config is', JSON.stringify(serverConfig, null, 2))
  }

  serverConfig = {
    ...serverConfig,
    plugins: [...serverConfig.plugins!],
  }

  return serverConfig
}
