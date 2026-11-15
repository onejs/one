import type { Plugin } from 'vite'
import { applyBuiltInPatches, type UserDepPatches } from '../utils/patches'

export function applyBuiltInPatchesPlugin(patches?: UserDepPatches): Plugin {
  return {
    name: 'vxrn-applyBuiltInPatchesPlugin',
    enforce: 'pre',

    async configResolved(config) {
      await applyBuiltInPatches({ root: config.root, patches }).catch((err) => {
        console.error(`\n 🥺 error applying built-in patches`, err)
      })
    },
  }
}
