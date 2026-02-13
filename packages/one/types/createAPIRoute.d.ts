import type { OneRouter } from './interfaces/router';
type MaybePromise<T> = T | Promise<T>;
type APIRouteHandler<Params extends Record<string, string> = Record<string, string>> = (request: Request, context: {
    params: Params;
}) => MaybePromise<Response>;
/**
 * Type helper for API route handlers with typed params.
 *
 * @example
 * ```ts
 * // app/api/users/[id]+api.ts
 * import { createAPIRoute } from 'one'
 *
 * export const GET = createAPIRoute<'/api/users/[id]'>((request, { params }) => {
 *   // params.id is typed as string
 *   return Response.json({ id: params.id })
 * })
 * ```
 */
export declare function createAPIRoute<Path extends string = string>(handler: APIRouteHandler<OneRouter.RouteType<Path>['Params']>): APIRouteHandler<OneRouter.RouteType<Path>["Params"]>;
export type { APIRouteHandler };
//# sourceMappingURL=createAPIRoute.d.ts.map