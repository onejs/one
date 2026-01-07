import { getRoutes } from "../router/getRoutes";
import { isTypedRoute, removeSupportedExtensions } from "../router/matchers";
import type { RouteNode } from "../router/Route";
import type { One } from "../vite/types";

// /[...param1]/ - Match [...param1]
const CATCH_ALL = /\[\.\.\..+?\]/g;
// /[param1] - Match [param1]
const SLUG = /\[.+?\]/g;

export function getTypedRoutesDeclarationFile(ctx: One.RouteContext) {
  const staticRoutes = new Set<string>();
  const dynamicRoutes = new Set<string>();
  const dynamicRouteContextKeys = new Set<string>();

  walkRouteNode(
    getRoutes(ctx, {
      platformRoutes: false, // We don't need to generate platform specific routes
      ignoreEntryPoints: true,
      ignoreRequireErrors: true,
      // importMode: 'async',
    }),
    "",
    staticRoutes,
    dynamicRoutes,
    dynamicRouteContextKeys,
  );

  const hasRoutes = dynamicRouteContextKeys.size > 0;

  return `// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: ${setToUnionType(staticRoutes)}
      DynamicRoutes: ${setToUnionType(dynamicRoutes)}
      DynamicRouteTemplate: ${setToUnionType(dynamicRouteContextKeys)}
      IsTyped: true
      ${hasRoutes ? `RouteTypes: ${generateRouteTypesMap(dynamicRouteContextKeys)}` : ""}
    }
  }
}
${
  hasRoutes
    ? `
/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; params: Params; request?: Request }
}`
    : ""
}
`.trim();
}

/**
 * Generates a mapped type for all routes with their expanded types
 * This improves intellisense by showing actual param types instead of aliases
 */
function generateRouteTypesMap(dynamicRouteContextKeys: Set<string>): string {
  if (dynamicRouteContextKeys.size === 0) {
    return "{}";
  }

  const routes = [...dynamicRouteContextKeys].sort();

  const entries = routes
    .map((routePath) => {
      // Generate the param type inline for better intellisense
      const params = extractParams(routePath);
      const paramsType = params.length === 0 ? "{}" : generateInlineParamsType(params);

      return `        '${routePath}': RouteInfo<${paramsType}>`;
    })
    .join("\n");

  return `{\n${entries}\n      }`;
}

/**
 * Extract parameter names from a route path
 * e.g., "/docs/[slug]/[id]" -> ["slug", "id"]
 */
function extractParams(routePath: string): Array<{ name: string; isCatchAll: boolean }> {
  const params: Array<{ name: string; isCatchAll: boolean }> = [];
  const paramRegex = /\[(\.\.\.)?([\w]+)\]/g;
  let match;

  while ((match = paramRegex.exec(routePath)) !== null) {
    params.push({
      name: match[2],
      isCatchAll: match[1] === "...",
    });
  }

  return params;
}

/**
 * Generate inline params type for better intellisense
 * e.g., [{ name: "slug", isCatchAll: false }] -> "{ slug: string }"
 */
function generateInlineParamsType(params: Array<{ name: string; isCatchAll: boolean }>): string {
  const entries = params.map((p) => {
    const type = p.isCatchAll ? "string[]" : "string";
    return `${p.name}: ${type}`;
  });
  return `{ ${entries.join("; ")} }`;
}

/**
 * Walks a RouteNode tree and adds the routes to the provided sets
 */
function walkRouteNode(
  routeNode: RouteNode | null,
  parentRoutePath: string,
  staticRoutes: Set<string>,
  dynamicRoutes: Set<string>,
  dynamicRouteContextKeys: Set<string>,
) {
  if (!routeNode) return;

  addRouteNode(routeNode, parentRoutePath, staticRoutes, dynamicRoutes, dynamicRouteContextKeys);

  parentRoutePath = `${removeSupportedExtensions(`${parentRoutePath}/${routeNode.route}`).replace(/\/?index$/, "")}`; // replace /index with /

  for (const child of routeNode.children) {
    walkRouteNode(child, parentRoutePath, staticRoutes, dynamicRoutes, dynamicRouteContextKeys);
  }
}

/**
 * Given a RouteNode, adds the route to the correct sets
 * Modifies the RouteNode.route to be a typed-route string
 */
function addRouteNode(
  routeNode: RouteNode | null,
  parentRoutePath: string,
  staticRoutes: Set<string>,
  dynamicRoutes: Set<string>,
  dynamicRouteContextKeys: Set<string>,
) {
  if (!routeNode?.route) return;
  if (!isTypedRoute(routeNode.route)) return;

  let routePath = `${parentRoutePath}/${removeSupportedExtensions(routeNode.route).replace(/\/?index$/, "")}`; // replace /index with /

  if (!routePath.startsWith("/")) {
    routePath = `/${routePath}`;
  }

  if (routeNode.dynamic) {
    for (const path of generateCombinations(routePath)) {
      dynamicRouteContextKeys.add(path);
      dynamicRoutes.add(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentionally generating type string
        `${path.replaceAll(CATCH_ALL, "${string}").replaceAll(SLUG, "${OneRouter.SingleRoutePart<T>}")}`,
      );
    }
  } else {
    for (const combination of generateCombinations(routePath)) {
      staticRoutes.add(combination);
    }
  }
}

/**
 * Converts a Set to a TypeScript union type
 */
const setToUnionType = <T>(set: Set<T>) => {
  return set.size > 0
    ? [...set]
        .sort()
        .map((s) => `\`${s}\``)
        .join(" | ")
    : "never";
};

function generateCombinations(pathname) {
  const groups = pathname.split("/").filter((part) => part.startsWith("(") && part.endsWith(")"));
  const combinations: string[] = [];

  function generate(currentIndex, currentPath) {
    if (currentIndex === groups.length) {
      combinations.push(currentPath.replace(/\/{2,}/g, "/"));
      return;
    }

    const group = groups[currentIndex];
    const withoutGroup = currentPath.replace(`/${group}`, "");
    generate(currentIndex + 1, withoutGroup);
    generate(currentIndex + 1, currentPath);
  }

  generate(0, pathname);
  return combinations;
}
