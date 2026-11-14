import { type Options } from '../router/getRoutes.js';
import type { RouteInfo } from '../vite/types.js';
export type { Options } from '../router/getRoutes.js';
export type RouteInfoCompiled = RouteInfo & {
    compiledRegex: RegExp;
};
export type RoutesManifest<TRegex = string> = {
    apiRoutes: RouteInfo<TRegex>[];
    middlewareRoutes: RouteInfo<TRegex>[];
    pageRoutes: RouteInfo<TRegex>[];
    allRoutes: RouteInfo<TRegex>[];
};
export declare function createRoutesManifest(paths: string[], options: Options): RoutesManifest | null;
//# sourceMappingURL=createRoutesManifest.d.ts.map