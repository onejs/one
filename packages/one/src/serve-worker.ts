import { setServerGlobals } from './server/setServerGlobals'
import { setupBuildInfo } from './server/setupBuildOptions'
import { createWorkerHandler, type LazyRoutes } from './server/workerHandler'
import { ensureExists } from './utils/ensureExists'
import type { One } from './vite/types'

// re-export static HTML fetcher utilities for worker use
export { getFetchStaticHtml, setFetchStaticHtml } from './server/staticHtmlFetcher'

// re-export for use in generated worker code
export type { LazyRoutes }

/**
 * Creates a fetch handler for edge/worker environments (Cloudflare Workers, service workers, etc.)
 * No Hono dependency — routes are matched dynamically via compiled regexes against a mutable table.
 *
 * @returns `{ fetch, updateRoutes }` — call `fetch(request, env?, ctx?)` to handle requests
 *          (`env` and `ctx` are forwarded from the worker's fetch handler and surfaced on
 *          API route handler contexts as `{ env, executionCtx }`).
 *          Call `updateRoutes(newBuildInfo, newLazyRoutes?)` to hot-swap the route table.
 */
export async function serve(buildInfo: One.BuildInfo, lazyRoutes?: LazyRoutes) {
  setupBuildInfo(buildInfo)
  ensureExists(buildInfo.oneOptions)
  setServerGlobals()

  const handler = createWorkerHandler({
    oneOptions: buildInfo.oneOptions!,
    buildInfo,
    lazyRoutes: lazyRoutes!,
  })

  return {
    fetch: handler.handleRequest,
    updateRoutes(newBuildInfo: One.BuildInfo, newLazyRoutes?: LazyRoutes) {
      setupBuildInfo(newBuildInfo)
      handler.updateRoutes(newBuildInfo, newLazyRoutes)
    },
  }
}
