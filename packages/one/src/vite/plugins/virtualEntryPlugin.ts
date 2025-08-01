import type { Plugin } from 'vite'
import { isNativeEnvironment } from 'vxrn'
import type { One } from '../types'
import {
  resolvedVirtualEntryId,
  resolvedVirtualEntryIdNative,
  virtualEntryId,
  virtualEntryIdNative,
} from './virtualEntryConstants'
import {
  API_ROUTE_GLOB_PATTERN,
  ROUTE_GLOB_PATTERN,
  ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS,
  ROUTE_WEB_EXCLUSION_GLOB_PATTERNS,
} from '../../router/glob-patterns'

const USE_ONE_SETUP_FILE = `
if (process.env.ONE_SETUP_FILE) {
  import(/* @vite-ignore */ process.env.ONE_SETUP_FILE)
}
`

export function createVirtualEntry(options: {
  root: string
  router?: {
    ignoredRouteFiles?: Array<string>
  }
  flags: One.Flags
}): Plugin {
  const routeGlobs = [
    `/${options.root}/${ROUTE_GLOB_PATTERN}`,
    ...(options.router?.ignoredRouteFiles?.map((pattern) => `!/${options.root}/${pattern}`) || []),
  ]
  const apiRouteGlobs = `/${options.root}/${API_ROUTE_GLOB_PATTERN}`

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

// globbing ${JSON.stringify(routeGlobs)}
export default createApp({
  routes: import.meta.glob(${JSON.stringify([...routeGlobs, ...ROUTE_WEB_EXCLUSION_GLOB_PATTERNS.map((p) => `!${p}`)])}, { exhaustive: true }),
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

// globbing ${JSON.stringify(routeGlobs)}
export default createApp({
  routes: import.meta.glob(${JSON.stringify([...routeGlobs, ...ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS.map((p) => `!${p}`), `!${apiRouteGlobs}`])}, { exhaustive: true }),
  routerRoot: ${JSON.stringify(options.root)},
  flags: ${JSON.stringify(options.flags)},
})
        `
      }
    },
  }
}
