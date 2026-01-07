import { getRoutes, type Options } from "../router/getRoutes";
import type { One, RouteInfo } from "../vite/types";
import { getServerManifest } from "./getServerManifest";

export type { Options } from "../router/getRoutes";

export type RouteInfoCompiled = RouteInfo & {
  compiledRegex: RegExp;
};

export type RoutesManifest<TRegex = string> = {
  apiRoutes: RouteInfo<TRegex>[];
  middlewareRoutes: RouteInfo<TRegex>[];
  pageRoutes: RouteInfo<TRegex>[];
  allRoutes: RouteInfo<TRegex>[];
};

function createMockModuleWithContext(map: string[] = []) {
  const contextModule = (key) => ({ default() {} });

  Object.defineProperty(contextModule, "keys", {
    value: () => map,
  });

  return contextModule as One.RouteContext;
}

export function createRoutesManifest(paths: string[], options: Options): RoutesManifest | null {
  const routeTree = getRoutes(createMockModuleWithContext(paths), {
    ...options,
    preserveApiRoutes: true,
    ignoreRequireErrors: true,
    ignoreEntryPoints: true,
    platform: "web",
  });

  if (!routeTree) {
    throw new Error(`No route tree found in paths: ${JSON.stringify(paths)}`);
  }

  return getServerManifest(routeTree);
}
