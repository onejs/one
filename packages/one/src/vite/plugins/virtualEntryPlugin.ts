import type { Plugin } from 'vite'
import { isNativeEnvironment } from 'vxrn'
import {
  API_ROUTE_GLOB_PATTERN,
  ROUTE_GLOB_PATTERN,
  ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS,
  ROUTE_WEB_EXCLUSION_GLOB_PATTERNS,
} from '../../router/glob-patterns'
import type { One } from '../types'
import {
  resolvedVirtualEntryId,
  resolvedVirtualEntryIdNative,
  virtualEntryId,
  virtualEntryIdNative,
} from './virtualEntryConstants'

function getSetupFileImport(environmentName: string): string {
  const envVarMap = {
    client: 'ONE_SETUP_FILE_CLIENT',
    ssr: 'ONE_SETUP_FILE_SERVER',
    ios: 'ONE_SETUP_FILE_IOS',
    android: 'ONE_SETUP_FILE_ANDROID',
  }

  const envVar = envVarMap[environmentName]
  if (!envVar) return ''

  return `
if (process.env.${envVar}) {
  import(/* @vite-ignore */ process.env.${envVar})
}
`
}

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
          : getSetupFileImport(this.environment.name)
        return `
${prependCode}

import { createApp, registerPreloadedRoute as _registerPreloadedRoute } from 'one'

// Export registerPreloadedRoute so preload files can import it from this bundle
// Named export that wraps the original function
export function registerPreloadedRoute(key, module) {
  return _registerPreloadedRoute(key, module)
}

// Also expose on window for debugging and to prevent tree-shaking
if (typeof window !== 'undefined') {
  window.__oneRegisterPreloadedRoute = registerPreloadedRoute
}

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
          : getSetupFileImport(this.environment.name)
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
