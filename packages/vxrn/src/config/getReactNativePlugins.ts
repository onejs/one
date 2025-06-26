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
