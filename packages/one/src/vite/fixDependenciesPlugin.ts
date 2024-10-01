import type { Plugin } from 'vite'
import type { One } from './types'
import { applyOptimizePatches, applyDependencyPatches, type DepPatch } from 'vxrn'

// TEMP
let hasApplied = false

export function fixDependenciesPlugin(options?: One.FixDependencies): Plugin {
  const patches: DepPatch[] = []
  for (const key in options) {
    const value = options[key]
    patches.push({
      module: key,
      patchFiles:
        value && typeof value === 'object'
          ? value
          : {
              optimize: value as any,
            },
    })
  }

  return {
    name: 'one-fix-dependencies',

    async config(config) {
      if (!hasApplied && patches.length) {
        hasApplied = true
        await applyOptimizePatches(patches, config)
      }
    },

    async configResolved(config) {
      if (patches.length) {
        await applyDependencyPatches(patches, config)
      }
    },
  }
}
