import { loadConfigFromFile, mergeConfig, type InlineConfig, type UserConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import { webExtensions } from '../constants'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getServerConfigPlugin } from '../plugins/clientInjectPlugin'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { reactNativeDevAssetPlugin } from '../plugins/reactNativeDevAssetPlugin'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { mergeUserConfig } from './mergeUserConfig'

export async function getViteServerConfig(config: VXRNOptionsFilled) {
  const { root, server } = config
  const { optimizeDeps } = getOptimizeDeps('serve')
  const { config: userViteConfig } =
    (await loadConfigFromFile({
      mode: config.mode === 'development' ? 'dev' : 'prod',
      command: 'serve',
    })) ?? {}

  // TODO: can we move most of this into `one` plugin:
  let serverConfig: UserConfig = mergeConfig(
    getBaseViteConfig({
      mode: config.mode,
      projectRoot: root,
    }),

    {
      root,
      appType: 'custom',
      clearScreen: false,
      publicDir: 'public',
      plugins: [
        getServerConfigPlugin(),

        server.https ? mkcert() : null,

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

      // needs to be web-only
      // resolve: {
      //   alias: {
      //     // this is a relatively safe one as it should be 100% api surface compat that fixes ssr
      //     'react-native-svg': requireResolve('@tamagui/react-native-svg'),
      //   },
      // },

      ssr: {
        optimizeDeps,
      },

      environments: {
        client: {
          dev: {
            optimizeDeps: {
              include: ['react-native-screens'],
              esbuildOptions: {
                resolveExtensions: webExtensions,
              },
            },
          },
        },
      },

      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        cors: true,
        host: server.host,
      },
    } satisfies UserConfig
  ) satisfies InlineConfig

  const rerouteNoExternalConfig = userViteConfig?.ssr?.noExternal === true
  if (rerouteNoExternalConfig) {
    delete userViteConfig.ssr!.noExternal
  }

  serverConfig = mergeUserConfig(optimizeDeps, serverConfig, userViteConfig)

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
