import { type Options } from '../router/getRoutes';
import type { RouteInfo } from '../vite/types';
export type { Options } from '../router/getRoutes';
export type RouteInfoCompiled = RouteInfo & {
    compiledRegex: RegExp;
    honoPath: string;
};
export type RoutesManifest<TRegex = string> = {
    apiRoutes: RouteInfo<TRegex>[];
    middlewareRoutes: RouteInfo<TRegex>[];
    pageRoutes: RouteInfo<TRegex>[];
};
export declare function createRoutesManifest(paths: string[], options: Options): RoutesManifest | null;
//# sourceMappingURL=createRoutesManifest.d.ts.map