import { resolve } from 'node:path'
import { configuration } from '@vxrn/compiler'
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

type NormalizedSetupFiles = {
  client?: string
  server?: string
  ios?: string
  android?: string
}

function normalizeSetupFile(
  setupFile: One.PluginOptions['setupFile']
): NormalizedSetupFiles {
  if (!setupFile) return {}
  if (typeof setupFile === 'string') {
    return {
      client: setupFile,
      server: setupFile,
      ios: setupFile,
      android: setupFile,
    }
  }
  if ('native' in setupFile) {
    return {
      client: setupFile.client,
      server: setupFile.server,
      ios: setupFile.native,
      android: setupFile.native,
    }
  }
  const sf = setupFile as {
    client?: string
    server?: string
    ios?: string
    android?: string
  }
  return {
    client: sf.client,
    server: sf.server,
    ios: sf.ios,
    android: sf.android,
  }
}

type SetupImportResult = {
  /** Import statement to prepend (for native static imports) */
  importStatement: string
  /** Variable declaration for setup promise (for web dynamic imports) */
  promiseDeclaration: string
  /** The variable name to pass to createApp, or empty if no setup */
  promiseVarName: string
}

function getSetupFileImport(
  environmentName: string,
  setupFiles: NormalizedSetupFiles,
  useStaticImport: boolean,
  root?: string
): SetupImportResult {
  const envMap: Record<string, keyof NormalizedSetupFiles> = {
    client: 'client',
    ssr: 'server',
    ios: 'ios',
    android: 'android',
  }

  const key = envMap[environmentName]
  if (!key) return { importStatement: '', promiseDeclaration: '', promiseVarName: '' }

  const setupFile = setupFiles[key]
  if (!setupFile)
    return { importStatement: '', promiseDeclaration: '', promiseVarName: '' }

  // resolve to absolute path so rolldown can find it from virtual modules
  const resolvedSetupFile = root ? resolve(root, setupFile) : setupFile

  // For native, use static import since dynamic import doesn't work
  if (useStaticImport) {
    return {
      importStatement: `import ${JSON.stringify(resolvedSetupFile)}`,
      promiseDeclaration: '',
      promiseVarName: '',
    }
  }

  // For web, use a lazy function that returns the dynamic import promise.
  // This ensures the import only executes at runtime when createApp calls it,
  // not during build when the module is evaluated.
  return {
    importStatement: '',
    promiseDeclaration: `const __oneGetSetupPromise = () => import(${JSON.stringify(resolvedSetupFile)})`,
    promiseVarName: '__oneGetSetupPromise',
  }
}

export function createVirtualEntry(options: {
  root: string
  router?: One.PluginOptions['router']
  flags: One.Flags
  setupFile?: One.PluginOptions['setupFile']
}): Plugin {
  const routeGlobs = [
    `/${options.root}/${ROUTE_GLOB_PATTERN}`,
    ...(options.router?.ignoredRouteFiles?.map(
      (pattern) => `!/${options.root}/${pattern}`
    ) || []),
  ]
  const apiRouteGlobs = `/${options.root}/${API_ROUTE_GLOB_PATTERN}`

  const setupFiles = normalizeSetupFile(options.setupFile)
  let viteRoot = ''

  return {
    name: 'one-virtual-entry',
    enforce: 'pre',

    configResolved(config) {
      viteRoot = config.root
    },

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
        const isNative = isNativeEnvironment(this.environment)
        const setupResult = getSetupFileImport(
          this.environment.name,
          setupFiles,
          isNative, // only native needs static import; SSR now uses lazy import
          viteRoot
        )
        // When nativewind is enabled, import the components module to register Text, View, etc. with cssInterop
        const nativewindImport = configuration.enableNativewind
          ? `import 'react-native-css-interop/dist/runtime/components'`
          : ''
        // For web/SSR, pass getSetupPromise to createApp so it can call it at runtime
        const setupPromiseArg = setupResult.promiseVarName
          ? `getSetupPromise: ${setupResult.promiseVarName},`
          : ''
        return `
${setupResult.importStatement}
${setupResult.promiseDeclaration}
${nativewindImport}

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
  ${setupPromiseArg}
  routes: import.meta.glob(${JSON.stringify([...routeGlobs, ...ROUTE_WEB_EXCLUSION_GLOB_PATTERNS.map((p) => `!${p}`)])}, { exhaustive: true }),
  routerRoot: ${JSON.stringify(options.root)},
  flags: ${JSON.stringify(options.flags)},
})
        `
      }

      if (id === resolvedVirtualEntryIdNative) {
        const isNative = isNativeEnvironment(this.environment)
        const setupResult = getSetupFileImport(
          this.environment.name,
          setupFiles,
          isNative,
          viteRoot
        )
        return `
${setupResult.importStatement}

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
