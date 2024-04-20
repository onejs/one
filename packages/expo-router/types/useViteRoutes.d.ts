import type { GlobbedRouteImports } from './types';
export declare function useViteRoutes(routes: GlobbedRouteImports): any;
export declare function preloadRoutes(routes: any): Promise<{
    context: any;
    routerStore: import("./global-state/router-store").RouterStore;
}>;
export declare function loadRoutes(paths: any): Promise<any>;
//# sourceMappingURL=useViteRoutes.d.ts.map