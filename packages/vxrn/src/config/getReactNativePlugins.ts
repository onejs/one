import {
  ExpoManifestRequestHandlerPluginPluginOptions,
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
import { applyBuiltInPatchesPlugin } from '../plugins/applyBuiltInPatchesPlugin'

export function getReactNativePlugins(
  config?: Partial<
    Pick<VXRNOptionsFilled, 'cacheDir' | 'debugBundle' | 'debugBundlePaths' | 'entries'>
  >,
  {
    metro,
  }: {
    /** Passing a non-null value will enable metro mode */
    metro?: (MetroPluginOptions & ExpoManifestRequestHandlerPluginPluginOptions) | null
  } = {}
) {
  // when native is disabled (via one's `native: false`), skip all RN / metro
  // plugins so web-only projects don't spin up the RN dev server, middleware,
  // websockets, or rolldown native engine.
  if (globalThis['__vxrnEnableNativeEnv'] === false) {
    return []
  }

  const metroOptions: typeof metro = metro || globalThis['__vxrnMetroOptions__']
  if (metroOptions) {
    // Metro mode
    return [
      applyBuiltInPatchesPlugin(),
      metroExpoManifestRequestHandlerPlugin(metroOptions),
      metroPlugin(metroOptions),
    ]
  }

  return [
    createReactNativeDevServerPlugin(config),

    getServerConfigPlugin(),

    applyBuiltInPatchesPlugin(),

    expoManifestRequestHandlerPlugin({}),

    reactNativeDevAssetPlugin({
      assetExts: DEFAULT_ASSET_EXTS,
    }),
  ]
}
