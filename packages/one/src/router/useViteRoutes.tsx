import type { GlobbedRouteImports } from "../types";
import type { One } from "../vite/types";

// essentially a development helper

let lastVersion = 0;
let context;

// for some reason putting it in state doesnt even re-render
export function useViteRoutes(
  routes: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
  version?: number,
) {
  if (version && version > lastVersion) {
    // reload
    context = null;
    lastVersion = version;
  }

  if (!context) {
    loadRoutes(routes, routerRoot, options);
  }

  return context;
}

// store preloaded modules so resolve() can use them synchronously
let preloadedModules: Record<string, any> = {};

export function registerPreloadedRoute(key: string, module: any): void {
  preloadedModules[key] = module;
}

export function getPreloadedModule(key: string): any {
  return preloadedModules[key];
}

export function getPreloadedModuleKeys(): string[] {
  return Object.keys(preloadedModules);
}

/**
 * Checks if a dynamic route pattern matches an actual path.
 * Used to preload route modules for dynamic routes like [slug].
 *
 * @example
 * matchDynamicRoute("docs/[slug]", "docs/getting-started") // true
 * matchDynamicRoute("[...slug]", "a/b/c") // true (catch-all)
 */
function matchDynamicRoute(routePattern: string, actualPath: string): boolean {
  const routeSegments = routePattern.split("/");
  const pathSegments = actualPath.split("/");

  // handle catch-all routes like [...slug]
  const hasCatchAll = routeSegments.some((s) => s.startsWith("[..."));
  if (hasCatchAll) {
    // find the catch-all segment position
    const catchAllIdx = routeSegments.findIndex((s) => s.startsWith("[..."));
    // all segments before catch-all must match exactly (or be dynamic)
    for (let i = 0; i < catchAllIdx; i++) {
      if (!routeSegments[i]) continue;
      if (routeSegments[i].startsWith("[")) continue; // dynamic segment matches anything
      if (routeSegments[i] !== pathSegments[i]) return false;
    }
    // catch-all matches any remaining segments
    return pathSegments.length >= catchAllIdx;
  }

  // for non-catch-all, segment count should match
  if (routeSegments.length !== pathSegments.length) return false;

  for (let i = 0; i < routeSegments.length; i++) {
    const routeSeg = routeSegments[i];
    const pathSeg = pathSegments[i];

    // dynamic segment [param] matches any value
    if (routeSeg.startsWith("[") && routeSeg.endsWith("]")) {
      continue;
    }

    // static segment must match exactly
    if (routeSeg !== pathSeg) return false;
  }

  return true;
}

/**
 * Preloads route modules for a given URL path (production only).
 * This ensures route components are loaded before navigation completes,
 * preventing Suspense boundaries from triggering and causing flicker.
 *
 * Called during `linkTo()` to preload routes before client-side navigation.
 */
export async function preloadRouteModules(href: string): Promise<void> {
  const globbed = globalThis["__importMetaGlobbed"];
  if (!globbed) return;

  // normalize href to match route keys - /docs -> docs
  const normalizedHref = href === "/" ? "" : href.replace(/^\//, "").replace(/\/$/, "");

  const promises: Promise<any>[] = [];

  for (const key of Object.keys(globbed)) {
    // key looks like "/app/(site)/docs/_layout.tsx" or "/app/(site)/docs/index+ssg.tsx"
    // strip the /app/ prefix first
    let routePath = key.replace(/^\/[^/]+\//, "");

    // strip route groups like (site), (app) etc
    routePath = routePath.replace(/\([^)]+\)\//g, "");

    // strip file suffixes but keep the path structure
    routePath = routePath
      .replace(/\/_layout\.tsx$/, "")
      .replace(/\/index(\+[a-z]+)?\.tsx$/, "")
      .replace(/(\+[a-z]+)?\.tsx$/, "");

    // remove leading slash if any
    routePath = routePath.replace(/^\//, "");

    // check if this route is part of the target path
    const isStaticMatch =
      routePath === normalizedHref || // exact match
      routePath.startsWith(normalizedHref + "/") || // child route
      normalizedHref.startsWith(routePath + "/") || // parent layout
      routePath === "" || // root layout
      (normalizedHref !== "" && routePath === normalizedHref.split("/")[0]); // top-level match

    // also check dynamic route patterns like docs/[slug]
    const isDynamicMatch = routePath.includes("[") && matchDynamicRoute(routePath, normalizedHref);

    if ((isStaticMatch || isDynamicMatch) && typeof globbed[key] === "function") {
      promises.push(
        globbed[key]()
          .then((mod: any) => {
            preloadedModules[key] = mod;
          })
          .catch(() => {}),
      );
    }
  }

  await Promise.all(promises);
}

export function loadRoutes(
  paths: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
) {
  if (context) return context;
  globalThis["__importMetaGlobbed"] = paths;
  context = globbedRoutesToRouteContext(paths, routerRoot, options);
  return context;
}

export function globbedRoutesToRouteContext(
  paths: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
): One.RouteContext {
  // make it look like webpack context
  const routesSync = {};
  const promises = {};
  const loadedRoutes = {};
  const clears = {};

  Object.keys(paths).forEach((path) => {
    if (!paths[path]) {
      console.error(`Error: Missing route at path ${path}`);
      return;
    }
    const loadRouteFunction = paths[path];
    const pathWithoutRelative = path.replace(`/${routerRoot}/`, "./");

    const originalPath = pathWithoutRelative.slice(1).replace(/\.[jt]sx?$/, "");
    if (options?.routeModes?.[originalPath] === "spa") {
      console.info(`Spa mode: ${originalPath}`);
      // in SPA mode return null for any route
      loadedRoutes[pathWithoutRelative] = () => {
        return null;
      };
    } else {
      routesSync[pathWithoutRelative] = loadRouteFunction;
    }
  });

  const moduleKeys = Object.keys(routesSync);

  function resolve(id: string) {
    clearTimeout(clears[id]);

    if (loadedRoutes[id]) {
      return loadedRoutes[id];
    }

    // check if this route was preloaded (via preload file or hydration)
    const preloadKey = id.replace("./", `/${routerRoot}/`);
    const preloaded = getPreloadedModule(preloadKey);
    if (preloaded) {
      loadedRoutes[id] = preloaded;
      return preloaded;
    }

    if (typeof routesSync[id] !== "function") {
      return routesSync[id];
    }

    if (!promises[id]) {
      promises[id] = routesSync[id]()
        .then((val: any) => {
          loadedRoutes[id] = val;
          delete promises[id];

          // clear cache so we get fresh contents in dev mode (hacky)
          clears[id] = setTimeout(() => {
            delete loadedRoutes[id];
          }, 500);

          return val;
        })
        .catch((err) => {
          console.error(`Error loading route`, id, err, new Error().stack);
          loadedRoutes[id] = {
            default: () => null,
          };
          delete promises[id];
        });

      if (process.env.NODE_ENV === "development") {
        promises[id].stack = new Error().stack;
      }
    }

    // this is called in useScreens value.loadRoute
    // see getRoutes.ts contextModule.loadRoute
    // where contextModule === this resolve function
    throw promises[id];
  }

  resolve.keys = () => moduleKeys;
  resolve.id = "";
  resolve.resolve = (id: string) => id;

  return resolve;
}
