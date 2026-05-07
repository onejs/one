import { getActionFromState, type LinkingOptions } from '@react-navigation/native'
import type { State } from '../fork/getPathFromState'
import { getReactNavigationConfig, type Screen } from '../getReactNavigationConfig'
import {
  addEventListener,
  getDefaultLinkingPrefixes,
  getInitialURL,
  getPathFromState,
  getStateFromPath,
} from '../link/linking'
import { normalizeLinkingConfig, type OneLinkingConfig } from '../link/getLinking'
import { evictOldest } from '../utils/evictOldest'
import type { RouteNode } from './Route'

export function getNavigationConfig(
  routes: RouteNode,
  metaOnly = true
): {
  initialRouteName?: string
  screens: Record<string, Screen>
} {
  return getReactNavigationConfig(routes, metaOnly)
}

export type OneLinkingOptions = LinkingOptions<object> & {
  getPathFromState?: typeof getPathFromState
}

export function getLinkingConfig(
  routes: RouteNode,
  metaOnly = true,
  linking?: OneLinkingConfig
): OneLinkingOptions {
  const config = getNavigationConfig(routes, metaOnly)
  const resolvedLinking = normalizeLinkingConfig(linking, getDefaultLinkingPrefixes())
  return {
    prefixes: resolvedLinking.prefixes,
    filter: resolvedLinking.filter,
    // @ts-expect-error
    config,
    // A custom getInitialURL is used on native to ensure the app always starts at
    // the root path if it's launched from something other than a deep link.
    // This helps keep the native functionality working like the web functionality.
    // For example, if you had a root navigator where the first screen was `/settings` and the second was `/index`
    // then `/index` would be used on web and `/settings` would be used on native.
    getInitialURL,
    subscribe: addEventListener,
    getStateFromPath: getStateFromPathMemoized,
    getPathFromState(state: State, options: Parameters<typeof getPathFromState>[1]) {
      return (
        getPathFromState(state, {
          ...config,
          ...options,
        }) ?? '/'
      )
    },
    // Add all functions to ensure the types never need to fallback.
    // This is a convenience for usage in the package.
    getActionFromState,
  }
}

export const stateCache = new Map<string, any>()

const STATE_CACHE_THRESHOLD = 5000
const STATE_CACHE_EVICTION = 1000

export function clearStateCache() {
  stateCache.clear()
}

/** memoize getStateFromPath by pathname. cache is cleared when the route tree
 * or linking config changes (see ensureBaseLinkingConfig in linkingConfig.ts). */
function getStateFromPathMemoized(
  path: string,
  options: Parameters<typeof getStateFromPath>[1]
) {
  const cached = stateCache.get(path)
  if (cached) {
    return cached
  }
  const result = getStateFromPath(path, options)
  evictOldest(stateCache, STATE_CACHE_THRESHOLD, STATE_CACHE_EVICTION)
  stateCache.set(path, result)
  return result
}
