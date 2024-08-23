import type { Plugin } from 'vite'
import type { VXS } from './types'
import { applyPatches, type DepPatch } from 'vxrn'

export function fixDependenciesPlugin(options?: VXS.FixDependencies): Plugin {
  return {
    name: 'vxs-fix-dependencies',

    async config(config) {
      if (!options) {
        return
      }

      let patches: DepPatch[] = []

      for (const key in options) {
        const value = options[key]

        if (value === true) {
          config.optimizeDeps?.include?.push(key)
          continue
        }

        if (value === 'interop') {
          config.optimizeDeps?.include?.push(key)
          config.optimizeDeps?.needsInterop?.push(key)
        }

        if (typeof value === 'object') {
          patches.push({
            module: key,
            patchFiles: value,
          })
        }
      }

      if (patches.length) {
        await applyPatches(patches)
      }
    },
  }
}
