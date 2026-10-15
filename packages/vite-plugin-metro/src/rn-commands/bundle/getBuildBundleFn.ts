import type { ResolvedConfig } from 'vite'
import { buildBundle } from './buildBundle'

/**
 * Returns the metro build bundle function for a resolved vite config. Resolving
 * the config runs the metro plugin, which records its options on globalThis.
 */
export function getBuildBundleFn(viteConfig: ResolvedConfig) {
  return buildBundle.bind({
    viteConfig,
    metroPluginOptions: globalThis['__viteMetroPluginOptions__'],
  })
}
