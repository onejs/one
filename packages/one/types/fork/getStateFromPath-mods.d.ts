/**
 * This file exports things that will be used to modify the forked code in `getStateFromPath.ts`.
 *
 * The purpose of keeping things in this separated file is to keep changes to the copied code as little as possible, making merging upstream updates easier.
 */
import type { InitialRouteConfig, ParsedRoute, RouteConfig } from "./getStateFromPath";
export type AdditionalRouteConfig = {
  type: "static" | "dynamic" | "layout";
  userReadableName: string;
  isIndex: boolean;
  isInitial?: boolean;
  hasChildren: boolean;
  expandedRouteNames: string[];
  parts: string[];
  staticPartCount: number;
};
interface UrlWithReactNavigationConcessions {
  path: string;
  nonstandardPathname: string;
  hash: string;
  pathWithoutGroups: string;
}
export declare function getUrlWithReactNavigationConcessions(
  path: string,
  baseUrl?: string | undefined,
): UrlWithReactNavigationConcessions;
export declare function matchForEmptyPath(configs: RouteConfig[]):
  | {
      path: string;
      screen: string;
      regex?: RegExp;
      pattern: string;
      routeNames: string[];
      parse?: {
        [x: string]: (value: string) => any;
      };
      type: "static" | "dynamic" | "layout";
      userReadableName: string;
      isIndex: boolean;
      isInitial?: boolean;
      hasChildren: boolean;
      expandedRouteNames: string[];
      parts: string[];
      staticPartCount: number;
    }
  | undefined;
export declare function appendIsInitial(
  initialRoutes: InitialRouteConfig[],
): (config: RouteConfig) => RouteConfig;
export declare function getRouteConfigSorter(
  previousSegments?: string[],
): (a: RouteConfig, b: RouteConfig) => number;
export declare function formatRegexPattern(it: string): string;
export declare function decodeURIComponentSafe(str: string): string;
/**
 * In One, the params are available at all levels of the routing config
 */
export declare function populateParams(
  routes?: ParsedRoute[],
  params?: Record<string, any>,
): ParsedRoute[] | undefined;
export declare function createConfigItemAdditionalProperties(
  screen: string,
  pattern: string,
  routeNames: string[],
  config?: Record<string, any>,
): Omit<AdditionalRouteConfig, "isInitial">;
export declare function parseQueryParamsExtended(
  path: string,
  route: ParsedRoute,
  parseConfig?: Record<string, (value: string) => any>,
  hash?: string,
): Record<string, string | string[]> | undefined;
export declare function stripBaseUrl(path: string, baseUrl?: string | undefined): string;
export {};
//# sourceMappingURL=getStateFromPath-mods.d.ts.map
