import type { One, RouteInfo } from "../vite/types";
export declare function buildPage(
  serverEntry: string,
  path: string,
  relativeId: string,
  params: any,
  foundRoute: RouteInfo<string>,
  clientManifestEntry: any,
  staticDir: string,
  clientDir: string,
  builtMiddlewares: Record<string, string>,
  serverJsPath: string,
  preloads: string[],
  allCSS: string[],
  routePreloads: Record<string, string>,
  allCSSContents?: string[],
  criticalPreloads?: string[],
  deferredPreloads?: string[],
  useAfterLCP?: boolean,
  useAfterLCPAggressive?: boolean,
): Promise<One.RouteBuildInfo>;
//# sourceMappingURL=buildPage.d.ts.map
