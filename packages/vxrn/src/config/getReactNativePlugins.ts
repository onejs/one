import type { VXRNOptionsFilled } from './getOptionsFilled'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getServerConfigPlugin } from '../plugins/clientInjectPlugin'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { reactNativeDevAssetPlugin } from '../plugins/reactNativeDevAssetPlugin'
import { createReactNativeDevServerPlugin } from '../plugins/reactNativeDevServer'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { applyBuiltInPatchesPlugin } from '../plugins/applyBuiltInPatchesPlugin'

export function getReactNativePlugins(config?: VXRNOptionsFilled) {
  return [
    createReactNativeDevServerPlugin(config),

    getServerConfigPlugin(),

    applyBuiltInPatchesPlugin(),

    // temp fix
    // avoid logging the optimizeDeps we add that aren't in the app:
    // likely we need a whole better solution to optimize deps
    {
      name: `avoid-optimize-logs`,

      configureServer() {
        const ogWarn = console.warn
        console.warn = (...args: any[]) => {
          if (typeof args[0] === 'string' && args[0].startsWith(`Failed to resolve dependency:`)) {
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

    expoManifestRequestHandlerPlugin({}),

    reactNativeDevAssetPlugin({
      assetExts: DEFAULT_ASSET_EXTS,
    }),
  ]
}
