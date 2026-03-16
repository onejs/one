import type { Plugin } from 'vite'
import { applyDependencyPatches, type DepPatch } from 'vxrn'
import type { One } from '../types'

export function fixDependenciesPlugin(options?: One.FixDependencies): Plugin {
  const patches: DepPatch[] = []
  for (const key in options) {
    const value = options[key]
    if (value && typeof value === 'object') {
      patches.push({
        module: key,
        patchFiles: value,
      })
    }
  }

  return {
    name: 'one-fix-dependencies',
    enforce: 'pre',

    async configResolved(config) {
      await applyDependencyPatches(patches, config)
    },
  }
}
