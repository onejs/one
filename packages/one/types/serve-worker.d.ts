import { Hono } from 'hono'
import type { One } from './vite/types'
export { setFetchStaticHtml, getFetchStaticHtml } from './server/staticHtmlFetcher'
/**
 * Lazy import functions for route modules.
 * Modules are loaded on-demand when a route is matched, not all upfront.
 */
export type LazyRoutes = {
  serverEntry: () => Promise<{
    default: {
      render: (props: any) => any
    }
  }>
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
export declare function serve(
  buildInfo: One.BuildInfo,
  lazyRoutes?: LazyRoutes
): Promise<Hono<import('hono/types').BlankEnv, import('hono/types').BlankSchema, '/'>>
//# sourceMappingURL=serve-worker.d.ts.map
