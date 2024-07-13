import { loadConfigFromFile, mergeConfig, type InlineConfig, type UserConfig } from 'vite'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { coerceToArray } from './coerceToArray'
import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { uniq } from './uniq'
import mkcert from 'vite-plugin-mkcert'

export async function getViteServerConfig(config: VXRNOptionsFilled) {
  const { root, host, https } = config
  const { optimizeDeps } = getOptimizeDeps('serve')
  const { config: userViteConfig } =
    (await loadConfigFromFile({
      mode: 'dev',
      command: 'serve',
    })) ?? {}

  let serverConfig: UserConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'development',
    }),
    {
      root,
      appType: 'custom',
      clearScreen: false,
      publicDir: 'public',
      plugins: [
        https ? mkcert() : null,

        reactNativeHMRPlugin(config),

        expoManifestRequestHandlerPlugin({
          projectRoot: root,
        }),

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

      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        cors: true,
        host,
      },
    } satisfies UserConfig
  ) satisfies InlineConfig

  if (userViteConfig) {
    serverConfig = mergeConfig(serverConfig, userViteConfig) as any
  }

  if (serverConfig.ssr?.noExternal && !Array.isArray(serverConfig.ssr?.noExternal)) {
    throw new Error(`ssr.noExternal must be array`)
  }

  // vite doesnt merge arrays but we want that

  if (userViteConfig) {
    serverConfig.ssr ||= {}
    serverConfig.ssr.optimizeDeps ||= {}

    userViteConfig.ssr ||= {}
    userViteConfig.ssr.optimizeDeps ||= {}

    serverConfig.ssr.noExternal = uniq([
      ...coerceToArray((serverConfig.ssr?.noExternal as string[]) || []),
      ...(serverConfig.ssr?.optimizeDeps.include || []),
      ...(userViteConfig.ssr?.optimizeDeps.include || []),
      ...coerceToArray(userViteConfig.ssr?.noExternal || []),
      ...optimizeDeps.include,
      'react',
      'react-dom',
      'react-dom/server',
      'react-dom/client',
    ])

    serverConfig.ssr.optimizeDeps.exclude = uniq([
      ...(serverConfig.ssr?.optimizeDeps.exclude || []),
      ...(userViteConfig.ssr?.optimizeDeps.exclude || []),
      ...optimizeDeps.exclude,
    ])

    serverConfig.ssr.optimizeDeps.include = uniq([
      ...(serverConfig.ssr?.optimizeDeps.include || []),
      ...(userViteConfig.ssr?.optimizeDeps.include || []),
      ...optimizeDeps.include,
    ])

    serverConfig.ssr.optimizeDeps.needsInterop = uniq([
      ...(serverConfig.ssr?.optimizeDeps.needsInterop || []),
      ...(userViteConfig.ssr?.optimizeDeps.needsInterop || []),
      ...optimizeDeps.needsInterop,
    ])

    serverConfig.ssr.optimizeDeps.esbuildOptions = {
      ...(serverConfig.ssr?.optimizeDeps.esbuildOptions || {}),
      ...(userViteConfig.ssr?.optimizeDeps.esbuildOptions || {}),
      ...optimizeDeps.esbuildOptions,
    }
  }

  // manually merge
  if (process.env.DEBUG) {
    console.debug('merged config is', JSON.stringify(serverConfig, null, 2))
  }

  serverConfig = {
    ...serverConfig,
    plugins: [...serverConfig.plugins!],
  }

  return serverConfig
}
