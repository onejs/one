import { type LazyRoutes } from './server/workerHandler';
import type { One } from './vite/types';
export { getFetchStaticHtml, setFetchStaticHtml } from './server/staticHtmlFetcher';
export type { LazyRoutes };
/**
 * Creates a fetch handler for edge/worker environments (Cloudflare Workers, service workers, etc.)
 * No Hono dependency — routes are matched dynamically via compiled regexes against a mutable table.
 *
 * @returns `{ fetch, updateRoutes }` — call `fetch(request, env?, ctx?)` to handle requests
 *          (`env` and `ctx` are forwarded from the worker's fetch handler and surfaced on
 *          API route handler contexts as `{ env, executionCtx }`).
 *          Call `updateRoutes(newBuildInfo, newLazyRoutes?)` to hot-swap the route table.
 */
export declare function serve(buildInfo: One.BuildInfo, lazyRoutes?: LazyRoutes): Promise<{
    fetch: (request: Request, env?: unknown, executionCtx?: unknown) => Promise<Response | null>;
    updateRoutes(newBuildInfo: One.BuildInfo, newLazyRoutes?: LazyRoutes): void;
}>;
//# sourceMappingURL=serve-worker.d.ts.map