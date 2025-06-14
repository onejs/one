import type { Plugin } from 'vite'
import type { VXRNOptionsFilled } from '../config/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'

export function applyBuiltInPatchesPlugin(): Plugin {
  return {
    name: 'vxrn-applyBuiltInPatchesPlugin',
    enforce: 'pre',

    async configResolved(config) {
      await applyBuiltInPatches({ root: config.root }).catch((err) => {
        console.error(`\n 🥺 error applying built-in patches`, err)
      })
    },
  }
}
