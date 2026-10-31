import { type LazyRoutes } from './server/workerHandler';
import type { One } from './vite/types';
export { withRange } from './server/assetRange';
export type { LazyRoutes };
/**
 * Creates a fetch handler for edge/worker environments (Cloudflare Workers, service workers, etc.)
 * No Hono dependency — routes are matched dynamically via compiled regexes against a mutable table.
 *
 * @returns `{ fetch, updateRoutes }` — call `fetch(request, env?, ctx?, fetchStaticHtml?)`
 *          with a request-scoped static HTML reader when serving SPA or SSG pages.
 *          (`env` and `ctx` are forwarded from the worker's fetch handler and surfaced on
 *          API route handler contexts as `{ env, executionCtx }`).
 *          Call `updateRoutes(newBuildInfo, newLazyRoutes?)` to hot-swap the route table.
 */
export declare function serve(buildInfo: One.BuildInfo, lazyRoutes?: LazyRoutes, serveOptions?: {
    disableModuleCache?: boolean;
}): Promise<{
    fetch: (request: Request, env?: unknown, executionCtx?: unknown, fetchStaticHtml?: (path: string) => Promise<string | null>) => Promise<Response | null>;
    updateRoutes(newBuildInfo: One.BuildInfo, newLazyRoutes?: LazyRoutes): void;
}>;
//# sourceMappingURL=serve-worker.d.ts.map