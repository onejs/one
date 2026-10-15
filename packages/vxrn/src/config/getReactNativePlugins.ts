import type { MetroPluginOptions } from '@vxrn/vite-plugin-metro'
import type { PluginOption } from 'vite'

import type { VXRNOptionsFilled } from './getOptionsFilled'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getServerConfigPlugin } from '../plugins/clientInjectPlugin'
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
    metro?: MetroPluginOptions | null
  } = {}
): PluginOption[] {
  // when native is disabled (via one's `native: false`), skip all RN / metro
  // plugins so web-only projects don't spin up the RN dev server, middleware,
  // websockets, or rolldown native engine.
  if (globalThis['__vxrnEnableNativeEnv'] === false) {
    return []
  }

  const metroOptions: typeof metro = metro || globalThis['__vxrnMetroOptions__']
  if (metroOptions) {
    // metro mode. metro is an optional peer, so only this mode loads it
    return [
      applyBuiltInPatchesPlugin(),
      import('@vxrn/vite-plugin-metro').then(({ metroPlugin }) => metroPlugin(metroOptions)),
    ]
  }

  return [
    createReactNativeDevServerPlugin(config),

    getServerConfigPlugin(),

    applyBuiltInPatchesPlugin(),

    reactNativeDevAssetPlugin({
      assetExts: DEFAULT_ASSET_EXTS,
    }),
  ]
}
