import type { GlobbedRouteImports } from "../types";
import type { One } from "../vite/types";
export declare function useViteRoutes(
  routes: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
  version?: number,
): any;
export declare function registerPreloadedRoute(key: string, module: any): void;
export declare function getPreloadedModule(key: string): any;
export declare function getPreloadedModuleKeys(): string[];
/**
 * Preloads route modules for a given URL path (production only).
 * This ensures route components are loaded before navigation completes,
 * preventing Suspense boundaries from triggering and causing flicker.
 *
 * Called during `linkTo()` to preload routes before client-side navigation.
 */
export declare function preloadRouteModules(href: string): Promise<void>;
export declare function loadRoutes(
  paths: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
): any;
export declare function globbedRoutesToRouteContext(
  paths: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
): One.RouteContext;
//# sourceMappingURL=useViteRoutes.d.ts.map
