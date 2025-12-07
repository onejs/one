import type { GlobbedRouteImports } from '../types';
import type { One } from '../vite/types';
export declare function useViteRoutes(routes: GlobbedRouteImports, routerRoot: string, options?: One.RouteOptions, version?: number): any;
export declare function registerPreloadedRoute(key: string, module: any): void;
export declare function getPreloadedModule(key: string): any;
export declare function loadRoutes(paths: GlobbedRouteImports, routerRoot: string, options?: One.RouteOptions): any;
export declare function globbedRoutesToRouteContext(paths: GlobbedRouteImports, routerRoot: string, options?: One.RouteOptions): One.RouteContext;
//# sourceMappingURL=useViteRoutes.d.ts.map