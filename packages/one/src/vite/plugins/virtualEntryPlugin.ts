import type { Plugin } from 'vite'
import { isNativeEnvironment } from 'vxrn'
import {
  resolvedVirtualEntryId,
  resolvedVirtualEntryIdNative,
  virtualEntryId,
  virtualEntryIdNative,
} from './virtualEntryConstants'

const USE_ONE_SETUP_FILE = `
if (process.env.ONE_SETUP_FILE) {
  import(/* @vite-ignore */ process.env.ONE_SETUP_FILE)
}
`

export function createVirtualEntry(options: { root: string }): Plugin {
  const appDirGlob = `/${options.root}/**/*.tsx`
  const appDirApiGlob = `/${options.root}/**/*+api.tsx`

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
  routes: import.meta.glob(['${appDirGlob}', '!${appDirApiGlob}']),
})
        `
      }
    },
  }
}
