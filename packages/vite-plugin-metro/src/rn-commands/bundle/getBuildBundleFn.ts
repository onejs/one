import { resolveConfig } from 'vite'
import { buildBundle } from './buildBundle'

/**
 * Returns the build bundle function.
 *
 * Returns null if the project is not using @vxrn/vite-plugin-metro.
 */
export async function getBuildBundleFn() {
  const viteConfig = await resolveConfig(
    {
      // configFile,
      // configLoader,
      // envFile,
      // forceOptimizeDeps,
    },
    'build'
  )

  // Should call `resolveConfig` before checking for `globalThis['__viteMetroPluginOptions__']`
  if (globalThis['__viteMetroPluginOptions__']) {
    const metroBuildBundle = buildBundle.bind({
      viteConfig,
      metroPluginOptions: globalThis['__viteMetroPluginOptions__'],
    })
    return metroBuildBundle
  }

  return null
}
