import { mergeConfig, type InlineConfig, type UserConfig } from 'vite'
import { getBaseViteConfig } from './getBaseViteConfig'
import type { VXRNConfigFilled } from './getOptionsFilled'
import { getOptimizeDeps } from './getOptimizeDeps'
import { uniq } from './uniq'
import { coerceToArray } from './coerceToArray'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'

export async function getViteServerConfig(config: VXRNConfigFilled) {
  const { root, host, webConfig } = config
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

  if (webConfig) {
    serverConfig = mergeConfig(serverConfig, webConfig) as any
  }

  if (serverConfig.ssr?.noExternal && !Array.isArray(serverConfig.ssr?.noExternal)) {
    throw new Error(`ssr.noExternal must be array`)
  }

  // vite doesnt merge arrays but we want that
  serverConfig.ssr ||= {}
  serverConfig.ssr.noExternal = [
    ...coerceToArray((serverConfig.ssr?.noExternal as string[]) || []),
    ...optimizeDeps.include,
    'react',
    'react-dom',
    'react-dom/server',
    'react-dom/client',
  ]

  serverConfig.ssr.optimizeDeps = {}
  serverConfig.ssr.optimizeDeps.exclude = uniq([
    ...(serverConfig.ssr?.optimizeDeps.exclude || []),
    ...optimizeDeps.exclude,
  ])

  serverConfig.ssr.optimizeDeps.include = uniq([
    ...(serverConfig.ssr?.optimizeDeps.include || []),
    ...optimizeDeps.include,
  ])

  serverConfig.ssr.optimizeDeps.needsInterop = uniq([
    ...(serverConfig.ssr?.optimizeDeps.needsInterop || []),
    ...optimizeDeps.needsInterop,
  ])

  serverConfig.ssr.optimizeDeps.esbuildOptions = {
    ...(serverConfig.ssr?.optimizeDeps.esbuildOptions || {}),
    ...optimizeDeps.esbuildOptions,
  }

  // manually merge
  if (process.env.DEBUG) {
    console.debug('server config is', serverConfig)
    console.debug('server ssr\n', JSON.stringify(serverConfig.ssr, null, 2))
  }

  serverConfig = {
    ...serverConfig,
    plugins: [...serverConfig.plugins!],
  }

  return serverConfig
}
