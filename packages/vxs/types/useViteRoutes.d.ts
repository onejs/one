import type { GlobbedRouteImports } from './types';
import type { VXS } from './vite/types';
export declare function useViteRoutes(routes: GlobbedRouteImports, options?: VXS.RouteOptions, version?: number): any;
export declare function loadRoutes(paths: Record<string, () => Promise<any>>, options?: VXS.RouteOptions): any;
//# sourceMappingURL=useViteRoutes.d.ts.map