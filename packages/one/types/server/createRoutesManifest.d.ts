import { type Options } from '../getRoutes';
import type { RouteNode } from '../Route';
import type { One } from '../vite/types';
export { type Options } from '../getRoutes';
export type RouteInfo<TRegex = string> = {
    file: string;
    page: string;
    namedRegex: TRegex;
    routeKeys: Record<string, string>;
    layouts?: RouteNode[];
    middlewares?: RouteNode[];
    type: One.RouteType;
    isNotFound?: boolean;
};
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