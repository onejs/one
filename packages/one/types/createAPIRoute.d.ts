import type { OneRouter } from './interfaces/router';
type MaybePromise<T> = T | Promise<T>;
/**
 * Minimal shape of the Cloudflare Workers `ExecutionContext`.
 * Use `context.worker?.executionCtx?.waitUntil(promise)` from an API handler
 * to keep the worker alive for fire-and-forget background work after the
 * response has been sent.
 */
export type WorkerExecutionContext = {
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
};
/** Cloudflare Workers `env` bindings. Shape is app-specific; `unknown` by default. */
export type WorkerEnv = Record<string, unknown>;
/**
 * Worker-runtime context surfaced on API handlers when running under an edge
 * runtime (Cloudflare Workers). Undefined in dev/Node.
 */
export type WorkerContext = {
    env?: WorkerEnv;
    executionCtx?: WorkerExecutionContext;
};
export type APIRouteContext<Params extends Record<string, string> = Record<string, string>> = {
    params: Params;
    /** Present on worker runtimes (Cloudflare Workers). Undefined in dev/Node. */
    worker?: WorkerContext;
};
type APIRouteHandler<Params extends Record<string, string> = Record<string, string>> = (request: Request, context: APIRouteContext<Params>) => MaybePromise<Response>;
/**
 * Type helper for API route handlers with typed params.
 *
 * @example
 * ```ts
 * // app/api/users/[id]+api.ts
 * import { createAPIRoute } from 'one'
 *
 * export const GET = createAPIRoute<'/api/users/[id]'>((request, { params, worker }) => {
 *   // params.id is typed as string
 *   // on cloudflare workers, worker.executionCtx.waitUntil() keeps background work alive
 *   worker?.executionCtx?.waitUntil(trackEvent(params.id))
 *   return Response.json({ id: params.id })
 * })
 * ```
 */
export declare function createAPIRoute<Path extends string = string>(handler: APIRouteHandler<OneRouter.RouteType<Path>['Params']>): APIRouteHandler<OneRouter.RouteType<Path>["Params"]>;
export type { APIRouteHandler };
//# sourceMappingURL=createAPIRoute.d.ts.map