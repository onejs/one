/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/core/src/getStateFromPath.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */

import type {
  InitialState,
  NavigationState,
  PartialState,
} from '@react-navigation/routers'
// biome-ignore lint/suspicious/noShadowRestrictedNames: ignore from forked code // @modified
import escape from 'escape-string-regexp'

// import * as queryString from 'query-string'

import type { PathConfigMap } from '@react-navigation/core' // @modified
import { getParamValue, isDynamicPart, replacePart } from './_shared'
import { findFocusedRoute } from './findFocusedRoute'
import {
  type AdditionalRouteConfig,
  appendIsInitial,
  createConfigItemAdditionalProperties,
  decodeURIComponentSafe,
  formatRegexPattern,
  getRouteConfigSorter,
  getUrlWithReactNavigationConcessions,
  matchForEmptyPath,
  parseQueryParamsExtended,
  populateParams,
} from './getStateFromPath-mods'
import { validatePathConfig } from './validatePathConfig'

type Options<ParamList extends {}> = {
  path?: string
  initialRouteName?: string
  screens: PathConfigMap<ParamList>
}

type ParseConfig = Record<string, (value: string) => any>

// @modified: add export
export type RouteConfig = {
  screen: string
  regex?: RegExp
  path: string
  pattern: string
  routeNames: string[]
  parse?: ParseConfig
} & AdditionalRouteConfig // @modified: union with AdditionalRouteConfig

// @modified: add export
export type InitialRouteConfig = {
  initialRouteName: string
  parentScreens: string[]
}

type ResultState = PartialState<NavigationState> & {
  state?: ResultState
}

// @modified: add export
export type ParsedRoute = {
  name: string
  path?: string
  params?: Record<string, any> | undefined
}

type ConfigResources = {
  initialRoutes: InitialRouteConfig[]
  configs: RouteConfig[]
  configWithRegexes: RouteConfig[]
}

/**
 * Utility to parse a path string to initial state object accepted by the container.
 * This is useful for deep linking when we need to handle the incoming URL.
 *
 * @example
 * ```js
 * getStateFromPath(
 *   '/chat/jane/42',
 *   {
 *     screens: {
 *       Chat: {
 *         path: 'chat/:author/:id',
 *         parse: { id: Number }
 *       }
 *     }
 *   }
 * )
 * ```
 * @param path Path string to parse and convert, e.g. /foo/bar?count=42.
 * @param options Extra options to fine-tune how to parse the path.
 */
export function getStateFromPath<ParamList extends {}>(
  path: string,
  options?: Options<ParamList>
): ResultState | undefined {
  const { initialRoutes, configs, configWithRegexes } = getConfigResources(options)

  const screens = options?.screens

  // @modified - start
  const pathData = getUrlWithReactNavigationConcessions(path)
  // @modified - end

  let remaining = pathData.nonstandardPathname // @modified: use `pathData.nonstandardPathname` instead of `path`
    .replace(/\/+/g, '/') // Replace multiple slash (//) with single ones
    .replace(/^\//, '') // Remove extra leading slash
    .replace(/\?.*$/, '') // Remove query params which we will handle later

  // Make sure there is a trailing slash
  remaining = remaining.endsWith('/') ? remaining : `${remaining}/`

  const prefix = options?.path?.replace(/^\//, '') // Remove extra leading slash

  if (prefix) {
    // Make sure there is a trailing slash
    const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`

    // If the path doesn't start with the prefix, it's not a match
    if (!remaining.startsWith(normalizedPrefix)) {
      return undefined
    }

    // Remove the prefix from the path
    remaining = remaining.replace(normalizedPrefix, '')
  }

  if (screens === undefined) {
    // When no config is specified, use the path segments as route names
    const routes = remaining
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        const name = decodeURIComponent(segment)
        return { name }
      })

    if (routes.length) {
      // @modified - start
      // return createNestedStateObject(path, routes, initialRoutes)
      return createNestedStateObject(pathData, routes, initialRoutes, [])
      // @modified - end
    }

    return undefined
  }

  if (remaining === '/') {
    // We need to add special handling of empty path so navigation to empty path also works
    // When handling empty path, we should only look at the root level config
    // @modified - start
    // const match = configs.find(
    //   (config) =>
    //     config.path === '' &&
    //     config.routeNames.every(
    //       // Make sure that none of the parent configs have a non-empty path defined
    //       (name) => !configs.find((c) => c.screen === name)?.path
    //     )
    // )
    const match = matchForEmptyPath(configWithRegexes)
    // @modified - end

    if (match) {
      return createNestedStateObject(
        pathData, // @modified: pass pathData instead of path
        match.routeNames.map((name) => ({ name })),
        initialRoutes,
        configs
      )
    }

    return undefined
  }

  let result: PartialState<NavigationState> | undefined
  let current: PartialState<NavigationState> | undefined

  // We match the whole path against the regex instead of segments
  // This makes sure matches such as wildcard will catch any unmatched routes, even if nested
  const { routes, remainingPath } = matchAgainstConfigs(remaining, configWithRegexes)

  if (routes !== undefined) {
    // This will always be empty if full path matched
    // @modified: pass pathData instead of path
    current = createNestedStateObject(pathData, routes, initialRoutes, configs)
    remaining = remainingPath
    result = current
  }

  if (current == null || result == null) {
    return undefined
  }

  return result
}

/**
 * Reference to the last used config resources. This is used to avoid recomputing the config resources when the options are the same.
 */
const cachedConfigResources = new WeakMap<Options<{}>, ConfigResources>()

function getConfigResources<ParamList extends {}>(
  options: Options<ParamList> | undefined
) {
  if (!options) return prepareConfigResources()

  const cached = cachedConfigResources.get(options)

  if (cached) return cached

  const resources = prepareConfigResources(options)

  cachedConfigResources.set(options, resources)

  return resources
}

// @modified: add previousSegments parameter
function prepareConfigResources(options?: Options<{}>, previousSegments?: string[]) {
  if (options) {
    validatePathConfig(options)
  }

  const initialRoutes = getInitialRoutes(options)

  // @modified: pass previousSegments
  const configs = getNormalizedConfigs(initialRoutes, options?.screens, previousSegments)

  checkForDuplicatedConfigs(configs)

  const configWithRegexes = getConfigsWithRegexes(configs)

  return {
    initialRoutes,
    configs,
    configWithRegexes,
  }
}

function getInitialRoutes(options?: Options<{}>) {
  const initialRoutes: InitialRouteConfig[] = []

  if (options?.initialRouteName) {
    initialRoutes.push({
      initialRouteName: options.initialRouteName,
      parentScreens: [],
    })
  }

  return initialRoutes
}

function getNormalizedConfigs(
  initialRoutes: InitialRouteConfig[],
  screens: PathConfigMap<object> = {},
  // @modified - start
  previousSegments?: string[]
  // @modified - end
) {
  // Create a normalized configs array which will be easier to use
  return (
    ([] as RouteConfig[])
      .concat(
        ...Object.keys(screens).map((key) =>
          createNormalizedConfigs(
            key,
            screens as PathConfigMap<object>,
            [],
            initialRoutes,
            []
          )
        )
      )
      /* @modified - start */
      // .sort((a, b) => {
      //   // Sort config so that:
      //   // - the most exhaustive ones are always at the beginning
      //   // - patterns with wildcard are always at the end

      //   // If 2 patterns are same, move the one with less route names up
      //   // This is an error state, so it's only useful for consistent error messages
      //   if (a.pattern === b.pattern) {
      //     return b.routeNames.join('>').localeCompare(a.routeNames.join('>'))
      //   }

      //   // If one of the patterns starts with the other, it's more exhaustive
      //   // So move it up
      //   if (a.pattern.startsWith(b.pattern)) {
      //     return -1
      //   }

      //   if (b.pattern.startsWith(a.pattern)) {
      //     return 1
      //   }

      //   const aParts = a.pattern.split('/')
      //   const bParts = b.pattern.split('/')

      //   for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      //     // if b is longer, b get higher priority
      //     if (aParts[i] == null) {
      //       return 1
      //     }
      //     // if a is longer, a get higher priority
      //     if (bParts[i] == null) {
      //       return -1
      //     }
      //     const aWildCard = aParts[i] === '*' || aParts[i].startsWith(':')
      //     const bWildCard = bParts[i] === '*' || bParts[i].startsWith(':')
      //     // if both are wildcard we compare next component
      //     if (aWildCard && bWildCard) {
      //       continue
      //     }
      //     // if only a is wild card, b get higher priority
      //     if (aWildCard) {
      //       return 1
      //     }
      //     // if only b is wild card, a get higher priority
      //     if (bWildCard) {
      //       return -1
      //     }
      //   }
      //   return bParts.length - aParts.length
      // })
      .map(appendIsInitial(initialRoutes))
      .sort(getRouteConfigSorter(previousSegments))
    /* @modified - end */
  )
}

function checkForDuplicatedConfigs(configs: RouteConfig[]) {
  // Check for duplicate patterns in the config
  configs.reduce<Record<string, RouteConfig>>((acc, config) => {
    if (acc[config.pattern]) {
      const a = acc[config.pattern].routeNames
      const b = config.routeNames

      // It's not a problem if the path string omitted from a inner most screen
      // For example, it's ok if a path resolves to `A > B > C` or `A > B`
      const intersects =
        a.length > b.length
          ? b.every((it, i) => a[i] === it)
          : a.every((it, i) => b[i] === it)

      if (!intersects) {
        throw new Error(
          `Found conflicting screens with the same pattern. The pattern '${
            config.pattern
          }' resolves to both '${a.join(' > ')}' and '${b.join(
            ' > '
          )}'. Patterns must be unique and cannot resolve to more than one screen.`
        )
      }
    }

    return Object.assign(acc, {
      [config.pattern]: config,
    })
  }, {})
}

function getConfigsWithRegexes(configs: RouteConfig[]) {
  return configs.map((c) => ({
    ...c,
    // Add `$` to the regex to make sure it matches till end of the path and not just beginning
    // @modified - start
    // regex: c.regex ? new RegExp(c.regex.source + '$') : undefined,
    regex: c.pattern
      ? new RegExp(`^(${c.pattern.split('/').map(formatRegexPattern).join('')})$`)
      : undefined,
    // @modified - end
  }))
}

const joinPaths = (...paths: string[]): string =>
  ([] as string[])
    .concat(...paths.map((p) => p.split('/')))
    .filter(Boolean)
    .join('/')

const matchAgainstConfigs = (remaining: string, configs: RouteConfig[]) => {
  let routes: ParsedRoute[] | undefined
  let remainingPath = remaining

  // @modified - start
  const allParams = Object.create(null)
  // @modified - end

  // Go through all configs, and see if the next path segment matches our regex
  for (const config of configs) {
    if (!config.regex) {
      continue
    }

    const match = remainingPath.match(config.regex)

    // If our regex matches, we need to extract params from the path
    if (match) {
      const matchResult = config.pattern?.split('/').reduce<{
        pos: number // Position of the current path param segment in the path (e.g in pattern `a/:b/:c`, `:a` is 0 and `:b` is 1)
        matchedParams: Record<string, Record<string, string>> // The extracted params
      }>(
        (acc, p, index) => {
          if (!isDynamicPart(p) /* @modified */) {
            return acc
          }

          // Path parameter so increment position for the segment
          acc.pos += 1

          const decodedParamSegment = decodeURIComponentSafe(
            // @modified: use decodeURIComponent**Safe**
            // The param segments appear every second item starting from 2 in the regex match result
            match![(acc.pos + 1) * 2]
              // Remove trailing slash
              .replace(/\/$/, '')
          )

          Object.assign(acc.matchedParams, {
            [p]: Object.assign(acc.matchedParams[p] || {}, {
              [index]: decodedParamSegment,
            }),
          })

          return acc
        },
        { pos: -1, matchedParams: {} }
      )

      const matchedParams = matchResult.matchedParams || {}

      routes = config.routeNames.map((name) => {
        const routeConfig = configs.find((c) => {
          // Check matching name AND pattern in case same screen is used at different levels in config
          return c.screen === name && config.pattern.startsWith(c.pattern)
        })

        // Normalize pattern to remove any leading, trailing slashes, duplicate slashes etc.
        const normalizedPath = routeConfig?.path.split('/').filter(Boolean).join('/')

        // Get the number of segments in the initial pattern
        const numInitialSegments = routeConfig?.pattern
          // Extract the prefix from the pattern by removing the ending path pattern (e.g pattern=`a/b/c/d` and normalizedPath=`c/d` becomes `a/b`)
          .replace(new RegExp(`${escape(normalizedPath!)}$`), '')
          ?.split('/').length

        const params = normalizedPath
          ?.split('/')
          .reduce<Record<string, unknown>>((acc, p, index) => {
            if (!isDynamicPart(p) /* @modified */) {
              return acc
            }

            // Get the real index of the path parameter in the matched path
            // by offsetting by the number of segments in the initial pattern
            const offset = numInitialSegments ? numInitialSegments - 1 : 0
            // @modified - start
            // const value = matchedParams[p]?.[index + offset]
            const value = getParamValue(p, matchedParams[p]?.[index + offset])
            // @modified - end

            if (value) {
              // @modified - start
              // const key = p.replace(/^:/, '').replace(/\?$/, '')
              const key = replacePart(p)
              // @modified - end
              acc[key] = routeConfig?.parse?.[key]
                ? routeConfig.parse[key](value as any)
                : value
            }

            return acc
          }, {})

        if (params && Object.keys(params).length) {
          Object.assign(allParams, params) // @modified: let page access layout params
          return { name, params }
        }

        return { name }
      })

      remainingPath = remainingPath.replace(match[1], '')

      break
    }
  }

  // @modified - start
  populateParams(routes, allParams)
  // @modified - end

  return { routes, remainingPath }
}

const createNormalizedConfigs = (
  screen: string,
  routeConfig: PathConfigMap<object>,
  routeNames: string[] = [],
  initials: InitialRouteConfig[],
  parentScreens: string[],
  parentPattern?: string
): RouteConfig[] => {
  const configs: RouteConfig[] = []

  routeNames.push(screen)

  parentScreens.push(screen)

  const config = routeConfig[screen]

  if (typeof config === 'string') {
    // If a string is specified as the value of the key(e.g. Foo: '/path'), use it as the pattern
    const pattern = parentPattern ? joinPaths(parentPattern, config) : config

    configs.push(createConfigItem(screen, routeNames, pattern, config))
  } else if (typeof config === 'object') {
    let pattern: string | undefined

    // if an object is specified as the value (e.g. Foo: { ... }),
    // it can have `path` property and
    // it could have `screens` prop which has nested configs
    if (typeof config.path === 'string') {
      if (config.exact && config.path === undefined) {
        throw new Error(
          "A 'path' needs to be specified when specifying 'exact: true'. If you don't want this screen in the URL, specify it as empty string, e.g. `path: ''`."
        )
      }

      pattern =
        config.exact !== true
          ? joinPaths(parentPattern || '', config.path || '')
          : config.path || ''

      // @modified - start
      // configs.push(createConfigItem(screen, routeNames, pattern!, config.path, config.parse))
      configs.push(
        createConfigItem(screen, routeNames, pattern!, config.path, config.parse, config)
      )
      // @modified - end
    }

    if (config.screens) {
      // property `initialRouteName` without `screens` has no purpose
      if (config.initialRouteName) {
        initials.push({
          initialRouteName: config.initialRouteName,
          parentScreens,
        })
      }

      Object.keys(config.screens).forEach((nestedConfig) => {
        const result = createNormalizedConfigs(
          nestedConfig,
          config.screens as PathConfigMap<object>,
          routeNames,
          initials,
          [...parentScreens],
          pattern ?? parentPattern
        )

        configs.push(...result)
      })
    }
  }

  routeNames.pop()

  return configs
}

const createConfigItem = (
  screen: string,
  routeNames: string[],
  pattern: string,
  path: string,
  parse: ParseConfig | undefined = undefined,
  // @modified - start
  config: Record<string, any> = {}
  // @modified - end
): RouteConfig => {
  // Normalize pattern to remove any leading, trailing slashes, duplicate slashes etc.
  pattern = pattern.split('/').filter(Boolean).join('/')

  const regex = pattern
    ? new RegExp(
        `^(${pattern
          .split('/')
          .map((it) => {
            if (it.startsWith(':')) {
              return `(([^/]+\\/)${it.endsWith('?') ? '?' : ''})`
            }

            return `${it === '*' ? '.*' : escape(it)}\\/`
          })
          .join('')})`
      )
    : undefined

  return {
    screen,
    regex,
    pattern,
    path,
    // The routeNames array is mutated, so copy it to keep the current state
    routeNames: [...routeNames],
    parse,
    // @modified - start
    ...createConfigItemAdditionalProperties(screen, pattern, routeNames, config),
    // @modified - end
  }
}

const findParseConfigForRoute = (
  routeName: string,
  flatConfig: RouteConfig[]
): ParseConfig | undefined => {
  for (const config of flatConfig) {
    if (routeName === config.routeNames[config.routeNames.length - 1]) {
      return config.parse
    }
  }

  return undefined
}

// Try to find an initial route connected with the one passed
const findInitialRoute = (
  routeName: string,
  parentScreens: string[],
  initialRoutes: InitialRouteConfig[]
): string | undefined => {
  for (const config of initialRoutes) {
    if (parentScreens.length === config.parentScreens.length) {
      let sameParents = true
      for (let i = 0; i < parentScreens.length; i++) {
        if (parentScreens[i].localeCompare(config.parentScreens[i]) !== 0) {
          sameParents = false
          break
        }
      }
      if (sameParents) {
        return routeName !== config.initialRouteName ? config.initialRouteName : undefined
      }
    }
  }
  return undefined
}

// returns state object with values depending on whether
// it is the end of state and if there is initialRoute for this level
const createStateObject = (
  initialRoute: string | undefined,
  route: ParsedRoute,
  isEmpty: boolean
): InitialState => {
  if (isEmpty) {
    if (initialRoute) {
      return {
        index: 1,
        routes: [{ name: initialRoute }, route],
      }
    } else {
      return {
        routes: [route],
      }
    }
  } else {
    if (initialRoute) {
      return {
        index: 1,
        routes: [{ name: initialRoute }, { ...route, state: { routes: [] } }],
      }
    } else {
      return {
        routes: [{ ...route, state: { routes: [] } }],
      }
    }
  }
}

const createNestedStateObject = (
  // @modified - start
  // path: string,
  { path, ...restPathData }: ReturnType<typeof getUrlWithReactNavigationConcessions>,
  // @modified - end
  routes: ParsedRoute[],
  initialRoutes: InitialRouteConfig[],
  flatConfig?: RouteConfig[]
) => {
  let route = routes.shift() as ParsedRoute
  const parentScreens: string[] = []

  let initialRoute = findInitialRoute(route.name, parentScreens, initialRoutes)

  parentScreens.push(route.name)

  const state: InitialState = createStateObject(initialRoute, route, routes.length === 0)

  if (routes.length > 0) {
    let nestedState = state

    while ((route = routes.shift() as ParsedRoute)) {
      initialRoute = findInitialRoute(route.name, parentScreens, initialRoutes)

      const nestedStateIndex = nestedState.index || nestedState.routes.length - 1

      nestedState.routes[nestedStateIndex].state = createStateObject(
        initialRoute,
        route,
        routes.length === 0
      )

      if (routes.length > 0) {
        nestedState = nestedState.routes[nestedStateIndex].state as InitialState
      }

      parentScreens.push(route.name)
    }
  }

  route = findFocusedRoute(state) as ParsedRoute
  // @modified - start
  // route.path = path
  route.path = restPathData.pathWithoutGroups
  // @modified - end

  // @modified - start
  // const params = parseQueryParams(
  //   path,
  //   flatConfig ? findParseConfigForRoute(route.name, flatConfig) : undefined
  // )
  const params = parseQueryParamsExtended(
    path,
    route,
    flatConfig ? findParseConfigForRoute(route.name, flatConfig) : undefined,
    restPathData.hash
  )
  // @modified - end

  if (params) {
    route.params = { ...route.params, ...params }
  }

  return state
}

// @modified: commenting out unused code
// const parseQueryParams = (path: string, parseConfig?: Record<string, (value: string) => any>) => {
//   const query = path.split('?')[1]
//   const params = queryString.parse(query)

//   if (parseConfig) {
//     Object.keys(params).forEach((name) => {
//       if (Object.hasOwnProperty.call(parseConfig, name) && typeof params[name] === 'string') {
//         params[name] = parseConfig[name](params[name] as string)
//       }
//     })
//   }

//   return Object.keys(params).length ? params : undefined
// }
