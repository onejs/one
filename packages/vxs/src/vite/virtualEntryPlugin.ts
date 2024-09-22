import type { Plugin } from 'vite'

export const virtualEntryIdName = `vxs-entry`
export const virtualEntryId = `virtual:${virtualEntryIdName}`
export const virtalEntryIdClient = `/@id/__x00__virtual:${virtualEntryIdName}`
const resolvedVirtualEntryId = '\0' + virtualEntryId

const virtualEntryIdNativeName = `${virtualEntryIdName}-native`
export const virtualEntryIdNative = `virtual:${virtualEntryIdNativeName}`
const resolvedVirtualEntryIdNative = '\0' + virtualEntryIdNativeName

export function createVirtualEntry(options: { root: string }): Plugin {
  const appDirGlob = `/${options.root}/**/*.tsx`

  return {
    name: 'vxs-virtual-entry',
    enforce: 'pre',

    resolveId(id) {
      if (id === virtualEntryId) {
        return resolvedVirtualEntryId
      }
      if (id === virtualEntryIdNative) {
        return resolvedVirtualEntryIdNative
      }
    },

    load(id) {
      if (id === resolvedVirtualEntryId) {
        return `
import { createApp } from 'one'

// globbing ${appDirGlob}
export default createApp({
  routes: import.meta.glob('${appDirGlob}'),
})
        `
      }

      if (id === resolvedVirtualEntryIdNative) {
        return `
import { createApp } from 'one'

// globbing ${appDirGlob}
export default createApp({
  routes: import.meta.glob('${appDirGlob}'),
})
        `
      }
    },
  }
}
