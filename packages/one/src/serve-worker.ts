import { Hono } from 'hono'
import { setServerGlobals } from './server/setServerGlobals'
import { setupBuildInfo } from './server/setupBuildOptions'
import { ensureExists } from './utils/ensureExists'
import type { One } from './vite/types'

// Re-export static HTML fetcher utilities for worker use
export { setFetchStaticHtml, getFetchStaticHtml } from './server/staticHtmlFetcher'

/**
 * Lazy import functions for route modules.
 * Modules are loaded on-demand when a route is matched, not all upfront.
 */
export type LazyRoutes = {
  serverEntry: () => Promise<{ default: { render: (props: any) => any } }>
  pages: Record<string, () => Promise<any>>
  api: Record<string, () => Promise<any>>
  middlewares: Record<string, () => Promise<any>>
}

/**
 * Creates a Hono app for edge/worker environments (Cloudflare Workers, etc.)
 * Static assets should be handled by the platform (e.g., wrangler's [assets] config)
 * This only sets up the dynamic routes (SSR, API, loaders)
 *
 * @param buildInfo - Build configuration and route metadata
 * @param lazyRoutes - Lazy import functions for route modules (loaded on-demand)
 */
export async function serve(buildInfo: One.BuildInfo, lazyRoutes?: LazyRoutes) {
  setupBuildInfo(buildInfo)
  ensureExists(buildInfo.oneOptions)
  setServerGlobals()

  const app = new Hono()

  const { oneServe } = await import('./server/oneServe')
  await oneServe(buildInfo.oneOptions, buildInfo, app, { lazyRoutes })

  return app
}
