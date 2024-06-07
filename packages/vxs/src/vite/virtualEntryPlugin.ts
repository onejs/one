import type { Plugin } from 'vite'

export const virtualEntryIdName = `vxs-entry`
export const virtualEntryId = `virtual:${virtualEntryIdName}`
export const virtalEntryIdClient = `/@id/__x00__virtual:${virtualEntryIdName}`
const resolvedVirtualEntryId = '\0' + virtualEntryId

export function createVirtualEntry(options: { root: string }): Plugin {
  return {
    name: 'vxs-virtual-entry',
    enforce: 'pre',

    resolveId(id) {
      if (id === virtualEntryId) {
        return resolvedVirtualEntryId
      }
    },

    load(id) {
      if (id === resolvedVirtualEntryId) {
        const appDirGlob = `/${options.root}/**/*.tsx`
        return `
          import { createApp } from 'vxs'

          // globbing ${appDirGlob}
          export default createApp({
            routes: import.meta.glob('${appDirGlob}'),
          })
        `
      }
    },
  }
}
