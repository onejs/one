import type { Plugin } from 'vite'
import { applyDependencyPatches, applyOptimizePatches, type DepPatch } from 'vxrn'
import type { One } from '../types'

let hasAppliedOptimizePatches = false

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
    enforce: 'pre',

    async config(config) {
      if (!hasAppliedOptimizePatches && patches.length) {
        hasAppliedOptimizePatches = true
        await applyOptimizePatches(patches, config)
      }
    },

    async configResolved(config) {
      await applyDependencyPatches(patches, config)
    },
  }
}
