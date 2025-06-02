import type { Plugin } from 'vite'
import { isNativeEnvironment } from 'vxrn'
import type { One } from '../types'
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

export function createVirtualEntry(options: { root: string; flags: One.Flags }): Plugin {
  const appDirGlob = `/${options.root}/**/*.tsx`
  const appDirApiGlob = `/${options.root}/**/*+api.tsx`

  console.log(`appDirGlob is ${appDirGlob}`)
  console.log(`appDirApiGlob is ${appDirApiGlob}`)

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
console.log('ve here 2839')
export default createApp({
  routes: import.meta.glob('${appDirGlob}', { exhaustive: true }),
  routerRoot: ${JSON.stringify(options.root)},
  flags: ${JSON.stringify(options.flags)},
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
console.log('ve here 2839')
export default createApp({
  routes: import.meta.glob(['${appDirGlob}', '!${appDirApiGlob}'], { exhaustive: true }),
  routerRoot: ${JSON.stringify(options.root)},
  flags: ${JSON.stringify(options.flags)},
})
        `
      }
    },
  }
}
