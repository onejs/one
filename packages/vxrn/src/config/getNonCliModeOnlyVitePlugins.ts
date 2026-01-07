import type { PluginOption } from 'vite'
import { defaultDepOptimizePlugin } from '../plugins/defaultDepOptimizePlugin'

/**
 * Configs that should (currently) apply when using VxRN in non-CLI mode (vxrn-vite-plugin.ts).
 *
 * By running the `vxrn` CLI, equivalent things are done but using different methods
 * that isn't applicable with pure Vite plugins.
 *
 * We can refactor this in the future to make it more consistent. Having this is just
 * to avoid changing too much at once and cause bugs in the original CLI mode.
 */
export function getNonCliModeOnlyVitePlugins(): PluginOption[] {
  return [
    defaultDepOptimizePlugin(), // In CLI mode this is done by `getViteServerConfig` in dev or config building logic in `vxrn/src/exports/build.ts` on build.
  ]
}
