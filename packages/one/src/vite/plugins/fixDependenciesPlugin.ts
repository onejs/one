import type { Plugin } from 'vite'
import { applyDependencyPatches, applyOptimizePatches, type DepPatch } from 'vxrn'
import type { One } from '../types'

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
      if (!hasApplied && patches.length) {
        hasApplied = true
        await applyDependencyPatches(patches, config)
      }
    },
  }
}
