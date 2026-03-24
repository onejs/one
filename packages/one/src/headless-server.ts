/**
 * one/headless-server — run One's server-side request handling in any environment.
 *
 * pure Request → Response handler with no Hono, no Node.js http server,
 * no filesystem dependency. works in browser Web Workers, Cloudflare Workers,
 * service workers, Deno, Bun, etc.
 *
 * handles:
 * - API routes (app/api/*)
 * - server loaders (export function loader())
 * - SSR page rendering (if serverEntry provided)
 * - middleware
 * - redirects
 *
 * usage:
 *
 *   import { createServer } from 'one/headless-server'
 *
 *   const server = await createServer({
 *     oneOptions: { web: { defaultRenderMode: 'spa' } },
 *     routes: {
 *       api: { '/api/hello': () => import('./api/hello') },
 *       pages: { '/index': () => import('./index') },
 *       middlewares: {},
 *       serverEntry: () => import('./entry-server'),
 *     },
 *     manifest: { pageRoutes: [...], apiRoutes: [...] },
 *   })
 *
 *   const response = await server.fetch(request)
 *   server.updateRoutes(newManifest, newRoutes)
 */

export { createWorkerHandler, type LazyRoutes } from './server/workerHandler'
export { compileManifest } from './createHandleRequest'
export type { RequestHandlers } from './createHandleRequest'
export { getFetchStaticHtml, setFetchStaticHtml } from './server/staticHtmlFetcher'
export type { One } from './vite/types'

import { setServerGlobals } from './server/setServerGlobals'
import { setupBuildInfo } from './server/setupBuildOptions'
import { createWorkerHandler, type LazyRoutes } from './server/workerHandler'
import type { One } from './vite/types'

export type HeadlessServerOptions = {
  /** One plugin options (at minimum: web.defaultRenderMode) */
  oneOptions: One.PluginOptions

  /**
   * build info — route manifest, route map, preloads, etc.
   * for dev/browser use, only `manifest` and `oneOptions` are required.
   * for production, provide the full buildInfo from the build step.
   */
  buildInfo?: Partial<One.BuildInfo>

  /** lazy route import functions */
  routes: LazyRoutes

  /**
   * route manifest — if not provided, extracted from buildInfo.
   * for dev/browser, pass the manifest directly to avoid needing full buildInfo.
   */
  manifest?: One.BuildInfo['manifest']
}

/**
 * create a headless One server — pure Request → Response handler.
 *
 * no Hono, no Node.js http server, no filesystem.
 * works in browser Web Workers, edge runtimes, etc.
 */
export async function createServer(options: HeadlessServerOptions) {
  const manifest = options.manifest || options.buildInfo?.manifest
  if (!manifest) throw new Error('one/headless-server: manifest is required')

  const buildInfo: One.BuildInfo = {
    manifest,
    oneOptions: options.oneOptions,
    routeToBuildInfo: options.buildInfo?.routeToBuildInfo ?? {},
    routeMap: options.buildInfo?.routeMap ?? {},
    preloads: options.buildInfo?.preloads ?? {},
    cssPreloads: options.buildInfo?.cssPreloads ?? {},
  } as One.BuildInfo

  setupBuildInfo(buildInfo)
  setServerGlobals()

  const handler = createWorkerHandler({
    oneOptions: options.oneOptions,
    buildInfo,
    lazyRoutes: options.routes,
  })

  return {
    /** handle an incoming request — returns Response or null (unmatched) */
    fetch: handler.handleRequest,

    /** hot-swap the route table without recreating the server */
    updateRoutes(newManifest: One.BuildInfo['manifest'], newRoutes?: LazyRoutes) {
      const newBuildInfo: One.BuildInfo = {
        ...buildInfo,
        manifest: newManifest,
      }
      setupBuildInfo(newBuildInfo)
      handler.updateRoutes(newBuildInfo, newRoutes)
    },
  }
}
