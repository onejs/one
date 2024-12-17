import type { Plugin } from 'vite'
import { isNativeEnvironment } from 'vxrn'

export const virtualEntryIdName = `one-entry`
export const virtualEntryId = `virtual:${virtualEntryIdName}`
export const virtalEntryIdClient = `/@id/__x00__virtual:${virtualEntryIdName}`
const resolvedVirtualEntryId = '\0' + virtualEntryId

const virtualEntryIdNativeName = `${virtualEntryIdName}-native`
export const virtualEntryIdNative = `virtual:${virtualEntryIdNativeName}`
const resolvedVirtualEntryIdNative = '\0' + virtualEntryIdNativeName

const USE_ONE_SETUP_FILE = `
if (process.env.ONE_SETUP_FILE) {
  import(/* @vite-ignore */ process.env.ONE_SETUP_FILE)
}
`

export function createVirtualEntry(options: { root: string }): Plugin {
  const appDirGlob = `/${options.root}/**/*.tsx`

  return {
    name: 'one-virtual-entry',
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
        const prependCode = isNativeEnvironment(this.environment)
          ? '' /* `import()` will not work on native */
          : USE_ONE_SETUP_FILE
        return `
${prependCode}

import { createApp } from 'one'

// globbing ${appDirGlob}
export default createApp({
  routes: import.meta.glob('${appDirGlob}'),
})
        `
      }

      if (id === resolvedVirtualEntryIdNative) {
        const prependCode = isNativeEnvironment(this.environment)
          ? '' /* `import()` will not work on native */
          : USE_ONE_SETUP_FILE
        return `
${prependCode}

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
