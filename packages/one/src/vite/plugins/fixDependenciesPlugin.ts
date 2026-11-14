import type { Plugin } from 'vite'
import { applyDependencyPatches, type DepPatch } from 'vxrn'
import type { One } from '../types'

export function fixDependenciesPlugin(options?: One.FixDependencies): Plugin {
  const patches: DepPatch[] = []
  for (const [key, value] of Object.entries(options || {})) {
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
      // with native enabled, vxrn applies these together with its built-in patches
      if (config.plugins.some((p) => p.name === 'vxrn-applyBuiltInPatchesPlugin')) return
      await applyDependencyPatches(patches, config)
    },
  }
}
