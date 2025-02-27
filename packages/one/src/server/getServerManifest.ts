/**
 * Copyright © 2023 Tamagui LLC.
 * Copyright © 2023 650 Industries.
 * Copyright © 2023 Vercel, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/vercel/next.js/blob/1df2686bc9964f1a86c444701fa5cbf178669833/packages/next/src/shared/lib/router/utils/route-regex.ts
 */
import type { RouteNode } from '../router/Route'
import { getContextKey, matchGroupName } from '../router/matchers'
import { sortRoutes } from '../router/sortRoutes'
import type { One, RouteInfo } from '../vite/types'

// TODO: Share these types across cli, server, router, etc.
export type OneRouterServerManifestV1Route<TRegex = string> = RouteInfo & {
  generated?: boolean
}

export type OneRouterServerManifestV1<TRegex = string> = {
  apiRoutes: OneRouterServerManifestV1Route<TRegex>[]
  middlewareRoutes: OneRouterServerManifestV1Route<TRegex>[]
  pageRoutes: OneRouterServerManifestV1Route<TRegex>[]
}

export interface Group {
  pos: number
  repeat: boolean
  optional: boolean
}

export interface RouteRegex {
  groups: Record<string, Group>
  re: RegExp
}

function isNotFoundRoute(route: RouteNode) {
  return Boolean(route.dynamic && route.dynamic[route.dynamic.length - 1].notFound)
}

// Given a nested route tree, return a flattened array of all routes that can be matched.
export function getServerManifest(route: RouteNode): OneRouterServerManifestV1 {
  function getFlatNodes(route: RouteNode, layouts?: RouteNode[]): [string, RouteNode][] {
    if (route.children.length) {
      return route.children.flatMap((child) => {
        return getFlatNodes(child, [...(layouts || []), route])
      })
    }

    // API Routes are handled differently to HTML routes because they have no nested behavior.
    // An HTML route can be different based on parent segments due to layout routes, therefore multiple
    // copies should be rendered. However, an API route is always the same regardless of parent segments.
    let key: string
    if (route.type === 'api') {
      key = getContextKey(route.contextKey).replace(/\/index$/, '') || '/'
    } else {
      const parentSegments = layouts?.flatMap((route) => {
        const key = getContextKey(route.route).replace(/\/index$/, '') || '/'
        if (key === '/' || key.startsWith('/(')) {
          return []
        }
        return [key]
      })

      key = parentSegments + getContextKey(route.route).replace(/\/index$/, '') || '/'
    }

    return [[key, { ...route, layouts }]]
  }

  // TODO this could be a lot faster if not functional:

  // Remove duplicates from the runtime manifest which expands array syntax.
  const flat = getFlatNodes(route)
    .sort(([, a], [, b]) => sortRoutes(b, a))
    .reverse()

  // warn on having multiple routes with the same path!
  const pathToRoute: Record<string, RouteNode> = {}
  for (const [path, route] of flat) {
    if (pathToRoute[path]) {
      console.warn(`\n[one] ❌ Duplicate routes error`)
      console.warn(`  Multiple routes at the same path! One route will always win over the other.`)
      console.warn(`    path: ${path}`)
      console.warn(`    first route: ${pathToRoute[path].contextKey}`)
      console.warn(`    second route: ${route.contextKey}\n`)
    }
    pathToRoute[path] = route
  }

  const apiRoutes: OneRouterServerManifestV1Route[] = []
  const middlewareRoutes: OneRouterServerManifestV1Route[] = []
  const pageRoutes: OneRouterServerManifestV1Route[] = []

  const addedMiddlewares: Record<string, boolean> = {}

  for (const [path, node] of flat) {
    if (node.type === 'api') {
      apiRoutes.push(getGeneratedNamedRouteRegex(path, node))
      continue
    }

    if (node.middlewares?.length) {
      for (const middleware of node.middlewares) {
        if (!addedMiddlewares[middleware.contextKey]) {
          addedMiddlewares[middleware.contextKey] = true
          middlewareRoutes.push(getGeneratedNamedRouteRegex(path, middleware))
        }
      }
    }

    pageRoutes.push(getGeneratedNamedRouteRegex(path, node))
  }

  return {
    apiRoutes,
    middlewareRoutes,
    pageRoutes,
  }
}

function getGeneratedNamedRouteRegex(
  normalizedRoute: string,
  node: RouteNode
): OneRouterServerManifestV1Route {
  return {
    ...getNamedRouteRegex(normalizedRoute, node),
    generated: true,
    isNotFound: isNotFoundRoute(node),
  }
}

function getNamedRouteRegex(
  normalizedRoute: string,
  node: RouteNode
): OneRouterServerManifestV1Route {
  const result = getPathMeta(normalizedRoute)

  return {
    file: node.contextKey,
    page: getContextKey(node.route),
    type: node.type,
    namedRegex: result.namedRegex,
    urlPath: result.urlPath,
    routeKeys: result.routeKeys,
    layouts: node.layouts,
    middlewares: node.middlewares,
  }
}

/**
 * Builds a function to generate a minimal routeKey using only a-z and minimal
 * number of characters.
 */
function buildGetSafeRouteKey() {
  let currentCharCode = 96 // Starting one before 'a' to make the increment logic simpler
  let currentLength = 1

  return () => {
    let result = ''
    let incrementNext = true

    // Iterate from right to left to build the key
    for (let i = 0; i < currentLength; i++) {
      if (incrementNext) {
        currentCharCode++
        if (currentCharCode > 122) {
          currentCharCode = 97 // Reset to 'a'
          incrementNext = true // Continue to increment the next character
        } else {
          incrementNext = false
        }
      }
      result = String.fromCharCode(currentCharCode) + result
    }

    // If all characters are 'z', increase the length of the key
    if (incrementNext) {
      currentLength++
      currentCharCode = 96 // This will make the next key start with 'a'
    }

    return result
  }
}

function removeTrailingSlash(route: string): string {
  return route.replace(/\/$/, '') || '/'
}

function getPathMeta(route: string) {
  const segments = removeTrailingSlash(route).slice(1).split('/')
  const getSafeRouteKey = buildGetSafeRouteKey()
  const routeKeys: Record<string, string> = {}

  let urlPath = ''

  const routeSegments = segments
    .map((segment, index) => {
      if (segment === '+not-found' && index === segments.length - 1) {
        segment = '[...not-found]'
      }

      if (/^\[.*\]$/.test(segment)) {
        const { name, optional, repeat } = parseParam(segment)
        // replace non-word characters since they can break the named regex
        let cleanedKey = name.replace(/\W/g, '')
        let invalidKey = false

        // check if the key is still invalid and fallback to using a known safe key
        if (cleanedKey.length === 0 || cleanedKey.length > 30) {
          invalidKey = true
        }
        if (!Number.isNaN(Number.parseInt(cleanedKey.slice(0, 1), 10))) {
          invalidKey = true
        }

        // Prevent duplicates after sanitizing the key
        if (cleanedKey in routeKeys) {
          invalidKey = true
        }

        if (invalidKey) {
          cleanedKey = getSafeRouteKey()
        }

        urlPath += repeat ? '/*' : `/:${name}${optional ? '?' : ''}`
        routeKeys[cleanedKey] = name

        return repeat
          ? optional
            ? `(?:/(?<${cleanedKey}>.+?))?`
            : `/(?<${cleanedKey}>.+?)`
          : `/(?<${cleanedKey}>[^/]+?)`
      }

      if (insideParensRegex.test(segment)) {
        const groupName = matchGroupName(segment)!
          .split(',')
          .map((group) => group.trim())
          .filter(Boolean)

        urlPath += `/:${groupName}?`

        if (groupName.length > 1) {
          const optionalSegment = `\\((?:${groupName.map(escapeStringRegexp).join('|')})\\)`

          // Make section optional
          return `(?:/${optionalSegment})?`
        }

        // Use simpler regex for single groups
        return `(?:/${escapeStringRegexp(segment)})?`
      }

      urlPath += `/${segment}`

      return `/${escapeStringRegexp(segment)}`
    })
    .join('')

  return {
    namedRegex: `^${routeSegments}(?:/)?$`,
    urlPath: urlPath === '' ? '/' : urlPath,
    routeKeys,
  }
}

const insideBracketsRegex = /^\[.*\]$/
const insideParensRegex = /^\(.*\)$/
const tripleDotRegex = /^\.\.\./
const replaceRegex = /[|\\{}()[\]^$+*?.-]/g
// based on https://github.com/sindresorhus/escape-string-regexp
const hasRegExpRegex = /[|\\{}()[\]^$+*?.-]/

function escapeStringRegexp(str: string) {
  // see also: https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/escapeRegExp.js#L23
  if (hasRegExpRegex.test(str)) {
    return str.replace(replaceRegex, '\\$&')
  }
  return str
}

export function parseParam(param: string) {
  let repeat = false
  let optional = false
  let name = param

  if (insideBracketsRegex.test(name)) {
    optional = true
    name = name.slice(1, -1)
  }

  if (tripleDotRegex.test(name)) {
    repeat = true
    name = name.slice(3)
  }

  return { name, repeat, optional }
}
