/**
 * This file exports things that will be used to modify the forked code in `getStateFromPath.ts`.
 *
 * The purpose of keeping things in this separated file is to keep changes to the copied code as little as possible, making merging upstream updates easier.
 */

import escape_ from 'escape-string-regexp'
import { matchGroupName, stripGroupSegmentsFromPath } from '../router/matchers'
import type { RouteConfig, ParsedRoute } from './getStateFromPath'

export type AdditionalRouteConfig = {
  type: 'static' | 'dynamic' | 'layout'
  userReadableName: string
  isIndex: boolean
  isInitial?: boolean
  hasChildren: boolean
  expandedRouteNames: string[]
  parts: string[]
}

export function getUrlWithReactNavigationConcessions(
  path: string,
  baseUrl: string | undefined = process.env.EXPO_BASE_URL
) {
  let parsed: URL
  try {
    parsed = new URL(path, 'https://phony.example')
  } catch {
    // Do nothing with invalid URLs.
    return {
      path,
      cleanUrl: '',
      nonstandardPathname: '',
      url: new URL('https://phony.example'),
    }
  }

  const pathname = parsed.pathname
  const withoutBaseUrl = stripBaseUrl(pathname, baseUrl)
  const pathWithoutGroups = stripGroupSegmentsFromPath(stripBaseUrl(path, baseUrl))

  // Make sure there is a trailing slash
  return {
    // The slashes are at the end, not the beginning
    path,
    nonstandardPathname: withoutBaseUrl.replace(/^\/+/g, '').replace(/\/+$/g, '') + '/',
    url: parsed,
    pathWithoutGroups,
  }
}

export function matchForEmptyPath(configs: RouteConfig[]) {
  // We need to add special handling of empty path so navigation to empty path also works
  // When handling empty path, we should only look at the root level config

  // NOTE: We only care about matching leaf nodes.
  const leafNodes = configs
    .filter((config) => !config.hasChildren)
    .map((value) => {
      return {
        ...value,
        // Collapse all levels of group segments before testing.
        // This enables `app/(one)/(two)/index.js` to be matched.
        path: stripGroupSegmentsFromPath(value.path),
      }
    })

  const match =
    leafNodes.find(
      (config) =>
        // NOTE: Test leaf node index routes that either don't have a regex or match an empty string.
        config.path === '' && (!config.regex || config.regex.test(''))
    ) ??
    leafNodes.find(
      (config) =>
        // NOTE: Test leaf node dynamic routes that match an empty string.
        config.path.startsWith(':') && config.regex!.test('')
    ) ??
    // NOTE: Test leaf node deep dynamic routes that match a slash.
    // This should be done last to enable dynamic routes having a higher priority.
    leafNodes.find((config) => config.path.startsWith('*') && config.regex!.test('/'))

  return match
}

export function formatRegexPattern(it: string): string {
  // Allow spaces in file path names.
  it = it.replace(' ', '%20')

  if (it.startsWith(':')) {
    // TODO: Remove unused match group
    return `(([^/]+\\/)${it.endsWith('?') ? '?' : ''})`
  }

  if (it.startsWith('*')) {
    return `((.*\\/)${it.endsWith('?') ? '?' : ''})`
  }

  // Strip groups from the matcher
  if (matchGroupName(it) != null) {
    // Groups are optional segments
    // this enables us to match `/bar` and `/(foo)/bar` for the same route
    // NOTE(EvanBacon): Ignore this match in the regex to avoid capturing the group
    return `(?:${escape(it)}\\/)?`
  }

  return escape_(it) + `\\/`
}

export function decodeURIComponentSafe(str: string) {
  try {
    return decodeURIComponent(str)
  } catch {
    return str
  }
}

export function getParamValue(p: string, value: string) {
  if (p.startsWith('*')) {
    const values = value.split('/').filter((v) => v !== '')
    return values.length === 0 && p.endsWith('?') ? undefined : values
  }

  return value
}

/**
 * In One, the params are available at all levels of the routing config
 */
export function populateParams(routes?: ParsedRoute[], params?: Record<string, any>) {
  if (!routes || !params || Object.keys(params).length === 0) return

  for (const route of routes) {
    Object.assign(route, { params })
  }

  return routes
}

export function createConfigItemAdditionalProperties(
  screen: string,
  pattern: string,
  routeNames: string[],
  config: Record<string, any> = {}
): Omit<AdditionalRouteConfig, 'isInitial'> {
  const parts: string[] = []
  let isDynamic = false
  const isIndex = screen === 'index' || screen.endsWith('/index')

  for (const part of pattern.split('/')) {
    if (part) {
      // If any part is dynamic, then the route is dynamic
      isDynamic ||= part.startsWith(':') || part.startsWith('*') || part.includes('*not-found')

      if (!matchGroupName(part)) {
        parts.push(part)
      }
    }
  }

  const hasChildren = config.screens ? !!Object.keys(config.screens)?.length : false
  const type = hasChildren ? 'layout' : isDynamic ? 'dynamic' : 'static'

  if (isIndex) {
    parts.push('index')
  }

  return {
    type,
    isIndex,
    hasChildren,
    parts,
    userReadableName: [...routeNames.slice(0, -1), config.path || screen].join('/'),
    expandedRouteNames: routeNames.flatMap((name) => {
      return name.split('/')
    }),
  }
}

export function parseQueryParamsExtended(
  path: string,
  route: ParsedRoute,
  parseConfig?: Record<string, (value: string) => any>,
  hash?: string
) {
  const searchParams = new URL(path, 'https://phony.example').searchParams;
  const params: Record<string, string | string[]> = Object.create(null);

  if (hash) {
    params['#'] = hash.slice(1);
  }

  for (const name of searchParams.keys()) {
    if (route.params?.[name]) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Route '/${route.name}' with param '${name}' was specified both in the path and as a param, removing from path`
        );
      }
    } else {
      const values = parseConfig?.hasOwnProperty(name)
        ? searchParams.getAll(name).map((value) => parseConfig[name](value))
        : searchParams.getAll(name);

      // searchParams.getAll returns an array.
      // if we only have a single value, and its not an array param, we need to extract the value
      params[name] = values.length === 1 ? values[0] : values;
    }
  }

  return Object.keys(params).length ? params : undefined;
}

export function stripBaseUrl(path: string, baseUrl: string | undefined = process.env.EXPO_BASE_URL) {
  if (process.env.NODE_ENV !== 'development') {
    if (baseUrl) {
      return path.replace(/^\/+/g, '/').replace(new RegExp(`^\\/?${escape(baseUrl)}`, 'g'), '')
    }
  }
  return path
}
