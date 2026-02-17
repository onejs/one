/**
 * Worker thread for parallel page building.
 */
import { parentPort } from 'node:worker_threads'
import { workerImport } from '../utils/workerImport'

if (!parentPort) {
  console.error('Must be run as a worker thread')
  process.exit(1)
}

// set up server environment (must happen before imports)
process.env.VXRN_REACT_19 = '1'
process.env.VITE_ENVIRONMENT = 'ssr'
// inherit NODE_ENV from parent process, default to production
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

// lazy-loaded imports
let buildPageFn: typeof import('./buildPage').buildPage | null = null
let runWithAsyncLocalContextFn:
  | typeof import('../vite/one-server-only').runWithAsyncLocalContext
  | null = null
let loadUserOneOptionsFn: typeof import('../vite/loadConfig').loadUserOneOptions | null =
  null
let initialized = false

async function ensureImports() {
  if (!buildPageFn) {
    const mod = await workerImport<typeof import('./buildPage')>(
      './buildPage',
      import.meta.url
    )
    buildPageFn = mod.buildPage
  }
  if (!runWithAsyncLocalContextFn) {
    const mod = await workerImport<typeof import('../vite/one-server-only')>(
      '../vite/one-server-only',
      import.meta.url
    )
    runWithAsyncLocalContextFn = mod.runWithAsyncLocalContext
  }
  if (!loadUserOneOptionsFn) {
    const mod = await workerImport<typeof import('../vite/loadConfig')>(
      '../vite/loadConfig',
      import.meta.url
    )
    loadUserOneOptionsFn = mod.loadUserOneOptions
  }
  return {
    buildPage: buildPageFn!,
    runWithAsyncLocalContext: runWithAsyncLocalContextFn!,
    loadUserOneOptions: loadUserOneOptionsFn!,
  }
}

async function initializeWorker() {
  if (initialized) return
  // load the user's vite config to get oneOptions
  // this avoids needing to serialize config through postMessage
  const { loadUserOneOptions } = await ensureImports()
  const { oneOptions } = await loadUserOneOptions('build', true)
  // set global plugin config that createManifest needs
  globalThis['__vxrnPluginConfig__'] = oneOptions
  initialized = true
}

parentPort.on('message', async (msg: any) => {
  if (msg.type === 'init') {
    // initialize worker by loading config from vite.config
    await initializeWorker()
    parentPort!.postMessage({ type: 'init-done', id: msg.id })
    return
  }

  if (msg.type === 'build') {
    try {
      const { buildPage, runWithAsyncLocalContext } = await ensureImports()
      // wrap in async local context for SSR render
      const result = await runWithAsyncLocalContext(async () => {
        return await buildPage(
          msg.args.serverEntry,
          msg.args.path,
          msg.args.relativeId,
          msg.args.params,
          msg.args.foundRoute,
          msg.args.clientManifestEntry,
          msg.args.staticDir,
          msg.args.clientDir,
          msg.args.builtMiddlewares,
          msg.args.serverJsPath,
          msg.args.preloads,
          msg.args.allCSS,
          msg.args.routePreloads,
          msg.args.allCSSContents,
          msg.args.criticalPreloads,
          msg.args.deferredPreloads,
          msg.args.useAfterLCP,
          msg.args.useAfterLCPAggressive
        )
      })
      parentPort!.postMessage({ type: 'done', id: msg.id, result })
    } catch (err) {
      parentPort!.postMessage({
        type: 'error',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    }
  }
})

// signal ready
parentPort.postMessage({ type: 'ready' })
