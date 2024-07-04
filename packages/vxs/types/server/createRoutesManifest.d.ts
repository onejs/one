import { type Options } from '../getRoutes';
import type { RouteNode } from '../Route';
export { type Options } from '../getRoutes';
export type RouteInfo<TRegex = string> = {
    file: string;
    page: string;
    namedRegex: TRegex;
    routeKeys: Record<string, string>;
    layouts?: RouteNode[];
};
export type RoutesManifest<TRegex = string> = {
    apiRoutes: RouteInfo<TRegex>[];
    spaRoutes: RouteInfo<TRegex>[];
    ssgRoutes: RouteInfo<TRegex>[];
    notFoundRoutes: RouteInfo<TRegex>[];
};
export declare function createRoutesManifest(paths: string[], options: Options): RoutesManifest | null;
//# sourceMappingURL=createRoutesManifest.d.ts.map