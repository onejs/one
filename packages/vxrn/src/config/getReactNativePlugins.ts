import {
  expoManifestRequestHandlerPlugin as metroExpoManifestRequestHandlerPlugin,
  metroPlugin,
  type MetroPluginOptions,
} from '@vxrn/vite-plugin-metro'

import type { VXRNOptionsFilled } from './getOptionsFilled'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getServerConfigPlugin } from '../plugins/clientInjectPlugin'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { reactNativeDevAssetPlugin } from '../plugins/reactNativeDevAssetPlugin'
import { createReactNativeDevServerPlugin } from '../plugins/reactNativeDevServer'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { applyBuiltInPatchesPlugin } from '../plugins/applyBuiltInPatchesPlugin'

export function getReactNativePlugins(
  config?: Partial<
    Pick<VXRNOptionsFilled, 'cacheDir' | 'debugBundle' | 'debugBundlePaths' | 'entries'>
  >,
  {
    metro,
  }: {
    /** Passing a non-null value will enable metro mode */
    metro?: MetroPluginOptions | null
  } = {}
) {
  const metroOptions: typeof metro = metro || globalThis['__vxrnMetroOptions__']
  if (metroOptions) {
    // Metro mode
    return [metroExpoManifestRequestHandlerPlugin(), metroPlugin(metroOptions)]
  }

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
