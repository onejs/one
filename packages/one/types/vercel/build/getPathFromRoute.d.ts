import type { RouteInfo } from '../../vite/types';
export declare function getPathFromRoute(route: RouteInfo<string>, options?: {
    includeIndex?: boolean;
    keepParamBrackets?: boolean;
}): string;
/**
 * The path of a route's function in .vercel/output/functions, and of the rewrites to it.
 * Vercel serves a function at its folder's path and reads no param syntax there, so params
 * stay as written ([id], [...slug]): `:` and `*` can't be in a folder name on Windows.
 */
export declare function getFunctionPathFromRoute(route: RouteInfo<string>, options?: {
    includeIndex?: boolean;
}): string;
//# sourceMappingURL=getPathFromRoute.d.ts.map