import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { configuration } from '@vxrn/compiler'
import micromatch from 'micromatch'
import type { Plugin } from 'vite'
import { isNativeEnvironment } from 'vxrn'
import {
  API_ROUTE_GLOB_PATTERN,
  ROUTE_GLOB_PATTERN,
  ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS,
  ROUTE_WEB_EXCLUSION_GLOB_PATTERNS,
} from '../../router/glob-patterns'
import { matchDirectoryRenderMode, matchFileRenderMode } from '../../router/matchers'
import type { RouteIndex } from '../../utils/routeIndex'
import type { One } from '../types'
import {
  resolvedVirtualEntryId,
  resolvedVirtualEntryIdNative,
  virtualEntryId,
  virtualEntryIdNative,
} from './virtualEntryConstants'

// rust-side hook filters, derived from the ids so they can't drift
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const VIRTUAL_ENTRY_SOURCE_RE = new RegExp(
  `^(?:${escapeRe(virtualEntryId)}|${escapeRe(virtualEntryIdNative)})$`
)
const VIRTUAL_ENTRY_RESOLVED_RE = new RegExp(
  `^(?:${escapeRe(resolvedVirtualEntryId)}|${escapeRe(resolvedVirtualEntryIdNative)})$`
)

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
    worker: 'server',
    ios: 'ios',
    android: 'android',
  }

  const key = envMap[environmentName]
  if (!key) return { importStatement: '', promiseDeclaration: '', promiseVarName: '' }

  const setupFile = setupFiles[key]
  if (!setupFile)
    return { importStatement: '', promiseDeclaration: '', promiseVarName: '' }

  // file:// URL is canonical; bare Windows absolute path has backslashes (mirrors createNativeDevEngine.ts)
  const resolvedSetupFile = root
    ? pathToFileURL(resolve(root, setupFile)).href
    : setupFile

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
  routeIndex: RouteIndex
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
  let isDevMode = false

  return {
    name: 'one-virtual-entry',
    enforce: 'pre',

    configResolved(config) {
      viteRoot = config.root
      isDevMode = config.command === 'serve'
    },

    // only the two virtual entry ids reach js; every other import in the graph
    // is rejected rust-side
    resolveId: {
      filter: { id: VIRTUAL_ENTRY_SOURCE_RE },
      handler(id) {
        if (id === virtualEntryId) {
          return resolvedVirtualEntryId
        }
        if (id === virtualEntryIdNative) {
          return resolvedVirtualEntryIdNative
        }
      },
    },

    load: {
      filter: { id: VIRTUAL_ENTRY_RESOLVED_RE },
      handler(id) {
        if (id === resolvedVirtualEntryId) {
          const isNative = isNativeEnvironment(this.environment)
          const isSSR =
            this.environment.name === 'ssr' || this.environment.name === 'worker'
          const serverSpaRouteFiles = isSSR
            ? options.routeIndex
                .getPaths()
                .map((file) => file.replace(/^\.\//, ''))
                .filter((file) => /\.tsx?$/.test(file))
                .filter(
                  (file) => !micromatch.isMatch(file, ROUTE_WEB_EXCLUSION_GLOB_PATTERNS)
                )
                .filter((file) => {
                  const parts = file.split('/')
                  const filename = parts.at(-1) || ''
                  if (
                    filename.startsWith('_layout') ||
                    filename.startsWith('_middleware')
                  ) {
                    return false
                  }

                  const fileMode = matchFileRenderMode(filename)
                  if (fileMode) return fileMode === 'spa'

                  let parentMode: One.RouteRenderMode | 'api' | undefined
                  for (const directory of parts.slice(0, -1)) {
                    parentMode =
                      matchDirectoryRenderMode(directory)?.renderMode ?? parentMode
                  }
                  return parentMode === 'spa'
                })
            : []
          const serverSpaRouteStubs = serverSpaRouteFiles
            .map(
              (file) =>
                `${JSON.stringify(`/${options.root}/${file}`)}: () => Promise.resolve({})`
            )
            .join(',\n    ')
          const serverSpaBuildGlobs = serverSpaRouteFiles.map(
            (file) => `/${options.root}/${file}`
          )
          const serverSpaExportGlob = (name: string) =>
            `  ${name}: import.meta.glob(${JSON.stringify(serverSpaBuildGlobs)}, { exhaustive: true, import: '${name}', query: '?one-spa-build' })`
          const serverSpaBuildRoutes = serverSpaBuildGlobs.length
            ? `{\n${['loader', 'loaderCache', 'generateStaticParams', 'sitemap']
                .map(serverSpaExportGlob)
                .join(',\n')}\n}`
            : '{}'
          const webRouteGlobs = [
            ...routeGlobs,
            ...ROUTE_WEB_EXCLUSION_GLOB_PATTERNS.map((pattern) => `!${pattern}`),
            ...serverSpaRouteFiles.map((file) => `!/${options.root}/${file}`),
          ]
          // native always needs static import. SSR in dev mode uses static import
          // so Vite crawls the setupFile's dep tree (including react) and pre-bundles
          // them before the first request. SSR in build mode uses lazy import so the
          // setupFile doesn't execute during the build phase.
          const useStaticImport = isNative || (isSSR && isDevMode)
          const setupResult = getSetupFileImport(
            this.environment.name,
            setupFiles,
            useStaticImport,
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
          const linkingArg = options.router?.linking
            ? `linking: ${JSON.stringify(options.router.linking)},`
            : ''

          // the react-refresh preamble has to be installed before the first
          // compiler-wrapped module evaluates, or that module throws "React refresh
          // preamble was not loaded" and client init aborts. /@one/dev.js installs
          // it, but it cannot be relied on to win: it is a DEFERRED module script,
          // so it waits for the document to finish parsing, while the client entry
          // is async and runs the moment it arrives. that race is decided by
          // document size. a SPA shell is a few hundred bytes and dev.js wins; a
          // prerendered +ssg/ssr page is hundreds of KB and the entry regularly
          // wins, throws on the first route module, and leaves the page unhydrated
          // and unthemed on the very same server. bundled dev has no working
          // /@one/dev.js at all, since it imports /@vite/client, which does not
          // exist there.
          // so install it from the entry, whose body is the one point guaranteed to
          // run before the lazily-globbed route modules in every dev client. the
          // !$RefreshReg$ guard makes this a no-op when dev.js already won, and
          // dev.js keeps its own install because injectIntoGlobalHook wants to run
          // before react evaluates. ('one' and /@react-refresh are node_modules /
          // the runtime, so neither is refresh-wrapped, and on the client the setup
          // file is imported lazily rather than statically.)
          // this must stay gated to a dev CLIENT. `isBundled` is true for EVERY
          // environment during build, so it cannot gate this on its own, and a prod
          // build emitting an import of /@react-refresh would reference a module
          // that only exists while serving.
          const isDevClient =
            this.environment.mode === 'dev' && this.environment.name === 'client'
          const refreshPreambleImport = isDevClient
            ? `import { injectIntoGlobalHook as __oneInjectRefresh } from '/@react-refresh'`
            : ''
          const refreshPreambleSetup = isDevClient
            ? `if (typeof window !== 'undefined' && !window.$RefreshReg$) {
  __oneInjectRefresh(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
}`
            : ''
          return `
${setupResult.promiseDeclaration}
${nativewindImport}
${refreshPreambleImport}

import { createApp, registerPreloadedRoute as _registerPreloadedRoute } from 'one'
${setupResult.importStatement}
${refreshPreambleSetup}

// Export registerPreloadedRoute so preload files can import it from this bundle
// Named export that wraps the original function
export function registerPreloadedRoute(key, module) {
  return _registerPreloadedRoute(key, module)
}

// Also expose on window for debugging and to prevent tree-shaking
if (typeof window !== 'undefined') {
  window.__oneRegisterPreloadedRoute = registerPreloadedRoute
}

// a route that declares spa by filename or parent directory is stubbed out of
// the route map below so the server never holds its page component. its
// server-side exports come from here instead, one glob per export so the page
// never comes with them.
export const oneServerSpaRouteExports = ${serverSpaBuildRoutes}

// globbing ${JSON.stringify(webRouteGlobs)}
export default createApp({
  ${setupPromiseArg}
  routes: {
    ...import.meta.glob(${JSON.stringify(webRouteGlobs)}, { exhaustive: true }),
    ${serverSpaRouteStubs}
  },
  routerRoot: ${JSON.stringify(options.root)},
  flags: ${JSON.stringify(options.flags)},
  ${linkingArg}
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
          const linkingArg = options.router?.linking
            ? `linking: ${JSON.stringify(options.router.linking)},`
            : ''
          return `
import { createApp } from 'one'
${setupResult.importStatement}

// globbing ${JSON.stringify(routeGlobs)}
export default createApp({
  routes: import.meta.glob(${JSON.stringify([...routeGlobs, ...ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS.map((p) => `!${p}`), `!${apiRouteGlobs}`])}, { exhaustive: true }),
  routerRoot: ${JSON.stringify(options.root)},
  flags: ${JSON.stringify(options.flags)},
  ${linkingArg}
})
        `
        }
      },
    },
  }
}
