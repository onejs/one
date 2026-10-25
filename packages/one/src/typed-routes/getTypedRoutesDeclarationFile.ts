import { getRoutes } from '../router/getRoutes'
import { isTypedRoute, removeSupportedExtensions } from '../router/matchers'
import type { RouteNode } from '../router/Route'
import type { One } from '../vite/types'

// /[...param1]/ - Match [...param1]
const CATCH_ALL = /\[\.\.\..+?\]/g
// /[param1] - Match [param1]
const SLUG = /\[.+?\]/g

export type TypedRoutesOptions = {
  /**
   * Type expressions (`typeof import(...)[name]`) for the search param schemas used
   * under a route, given the context key of its file.
   */
  getSearchParamTypes?: (contextKey: string) => string[]
}

export function getTypedRoutesDeclarationFile(
  ctx: One.RouteContext,
  options: TypedRoutesOptions = {}
) {
  const staticRoutes = new Set<string>()
  const dynamicRoutes = new Set<string>()
  const dynamicRouteContextKeys = new Set<string>()
  const searchParamSchemas = new Map<string, string[]>()

  walkRouteNode(
    getRoutes(ctx, {
      platformRoutes: false, // We don't need to generate platform specific routes
      ignoreEntryPoints: true,
      ignoreRequireErrors: true,
      // importMode: 'async',
    }),
    '',
    staticRoutes,
    dynamicRoutes,
    dynamicRouteContextKeys,
    searchParamSchemas,
    options.getSearchParamTypes
  )

  const hasRoutes = dynamicRouteContextKeys.size > 0

  return `// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:${setToUnionType(staticRoutes)}
      DynamicRoutes:${setToUnionType(dynamicRoutes)}
      DynamicRouteTemplate:${setToUnionType(dynamicRouteContextKeys)}
      IsTyped: true${
        searchParamSchemas.size
          ? `\n      SearchParamTypes: ${generateSearchParamTypesMap(searchParamSchemas, 'SearchParamsOf')}\n      SearchParamOutputs: ${generateSearchParamTypesMap(searchParamSchemas, 'SearchOutputOf')}`
          : ''
      }
      ${hasRoutes ? `RouteTypes: ${generateRouteTypesMap(dynamicRouteContextKeys)}` : ''}
    }
  }
}
${
  hasRoutes
    ? `
/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>, Path extends string = string> = {
  Params: Params
  LoaderProps: import('one').LoaderProps<Params, OneRouter.LoaderSearchParams<Path>>
}`
    : ''
}
`.trim()
}

function generateSearchParamTypesMap(
  searchParamSchemas: Map<string, string[]>,
  wrapper: 'SearchParamsOf' | 'SearchOutputOf'
): string {
  const entries = [...searchParamSchemas]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([routePath, schemas]) =>
        `        '${routePath}': ${schemas.map((schema) => `OneRouter.${wrapper}<${schema}>`).join(' & ')}`
    )
    .join('\n')
  return `{\n${entries}\n      }`
}

/**
 * Generates a mapped type for all routes with their expanded types
 * This improves intellisense by showing actual param types instead of aliases
 */
function generateRouteTypesMap(dynamicRouteContextKeys: Set<string>): string {
  if (dynamicRouteContextKeys.size === 0) {
    return '{}'
  }

  const routes = [...dynamicRouteContextKeys].sort()

  const entries = routes
    .map((routePath) => {
      // Generate the param type inline for better intellisense
      const params = extractParams(routePath)
      const paramsType = params.length === 0 ? '{}' : generateInlineParamsType(params)

      return `        '${routePath}': RouteInfo<${paramsType}, '${routePath}'>`
    })
    .join('\n')

  return `{\n${entries}\n      }`
}

/**
 * Extract parameter names from a route path
 * e.g., "/docs/[slug]/[id]" -> ["slug", "id"]
 */
function extractParams(routePath: string): Array<{ name: string; isCatchAll: boolean }> {
  const params: Array<{ name: string; isCatchAll: boolean }> = []
  const paramRegex = /\[(\.\.\.)?([\w]+)\]/g
  let match

  while ((match = paramRegex.exec(routePath)) !== null) {
    params.push({
      name: match[2],
      isCatchAll: match[1] === '...',
    })
  }

  return params
}

/**
 * Generate inline params type for better intellisense
 * e.g., [{ name: "slug", isCatchAll: false }] -> "{ slug: string }"
 */
function generateInlineParamsType(
  params: Array<{ name: string; isCatchAll: boolean }>
): string {
  const entries = params.map((p) => {
    const type = p.isCatchAll ? 'string[]' : 'string'
    return `${p.name}: ${type}`
  })
  return `{ ${entries.join('; ')} }`
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
  searchParamSchemas: Map<string, string[]>,
  getSearchParamTypes: TypedRoutesOptions['getSearchParamTypes']
) {
  if (!routeNode) return

  addRouteNode(
    routeNode,
    parentRoutePath,
    staticRoutes,
    dynamicRoutes,
    dynamicRouteContextKeys,
    searchParamSchemas,
    getSearchParamTypes
  )

  parentRoutePath = `${removeSupportedExtensions(`${parentRoutePath}/${routeNode.route}`).replace(/\/?index$/, '')}` // replace /index with /

  for (const child of routeNode.children) {
    walkRouteNode(
      child,
      parentRoutePath,
      staticRoutes,
      dynamicRoutes,
      dynamicRouteContextKeys,
      searchParamSchemas,
      getSearchParamTypes
    )
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
  searchParamSchemas: Map<string, string[]>,
  getSearchParamTypes: TypedRoutesOptions['getSearchParamTypes']
) {
  if (!routeNode?.route) return
  if (!isTypedRoute(routeNode.route)) return

  let routePath = `${parentRoutePath}/${removeSupportedExtensions(routeNode.route).replace(/\/?index$/, '')}` // replace /index with /

  if (!routePath.startsWith('/')) {
    routePath = `/${routePath}`
  }

  const schemaTypes =
    routeNode.type !== 'layout'
      ? getSearchParamTypes?.(routeNode.contextKey)
      : undefined
  const addSearchParamTypes = (path: string) => {
    if (schemaTypes?.length && !searchParamSchemas.has(path)) {
      searchParamSchemas.set(path, schemaTypes)
    }
  }

  if (routeNode.dynamic) {
    for (const path of generateCombinations(routePath)) {
      addSearchParamTypes(path)
      dynamicRouteContextKeys.add(path)
      dynamicRoutes.add(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: intentionally generating type string
        `${path.replaceAll(CATCH_ALL, '${string}').replaceAll(SLUG, '${OneRouter.SingleRoutePart<T>}')}`
      )
    }
  } else {
    for (const combination of generateCombinations(routePath)) {
      addSearchParamTypes(combination)
      staticRoutes.add(combination)
    }
  }
}

/**
 * Converts a Set to a TypeScript union type
 * Formats with one route per line for cleaner git diffs
 */
const setToUnionType = <T>(set: Set<T>) => {
  if (set.size === 0) return ' never'
  const sorted = [...set].sort()
  if (sorted.length === 1) return ` \`${sorted[0]}\``
  // format as multi-line union for cleaner diffs
  return '\n        | ' + sorted.map((s) => `\`${s}\``).join('\n        | ')
}

function generateCombinations(pathname) {
  const groups = pathname
    .split('/')
    .filter((part) => part.startsWith('(') && part.endsWith(')'))
  const combinations: string[] = []

  function generate(currentIndex, currentPath) {
    if (currentIndex === groups.length) {
      combinations.push(currentPath.replace(/\/{2,}/g, '/'))
      return
    }

    const group = groups[currentIndex]
    const withoutGroup = currentPath.replace(`/${group}`, '')
    generate(currentIndex + 1, withoutGroup)
    generate(currentIndex + 1, currentPath)
  }

  generate(0, pathname)
  return combinations
}
