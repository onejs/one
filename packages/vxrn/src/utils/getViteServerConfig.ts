import { loadConfigFromFile, mergeConfig, type InlineConfig, type UserConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { mergeUserConfig } from './mergeUserConfig'

export async function getViteServerConfig(config: VXRNOptionsFilled) {
  const { root, host, https, port } = config
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
          port,
        }),

        // TODO very hacky/arbitrary
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

  serverConfig = mergeUserConfig(optimizeDeps, serverConfig, userViteConfig)

  // manually merge
  // if (process.env.DEBUG) {
  console.debug('user config in:', JSON.stringify(userViteConfig, null, 2), `\n----\n`)
  console.debug('merged config:', JSON.stringify(serverConfig, null, 2), `\n----\n`)
  // }

  return serverConfig
}
