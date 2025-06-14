import type { Plugin } from 'vite'
import type { VXRNOptionsFilled } from '../config/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'

export function applyBuiltInPatchesPlugin(options: VXRNOptionsFilled): Plugin {
  return {
    name: 'vxrn-applyBuiltInPatchesPlugin',
    enforce: 'pre',

    async configResolved() {
      await applyBuiltInPatches(options).catch((err) => {
        console.error(`\n 🥺 error applying built-in patches`, err)
      })
    },
  }
}
