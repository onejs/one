import { getActionFromState, type LinkingOptions } from '@react-navigation/native'
import type { RouteNode } from './Route'
import type { State } from '../fork/getPathFromState'
import { getReactNavigationConfig, type Screen } from '../getReactNavigationConfig'
import {
  addEventListener,
  getInitialURL,
  getPathFromState,
  getStateFromPath,
} from '../link/linking'
import { applyRewrites, getRewriteConfig, reverseRewrite } from '../utils/rewrite'

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

export function getLinkingConfig(routes: RouteNode, metaOnly = true): OneLinkingOptions {
  const config = getNavigationConfig(routes, metaOnly)
  return {
    prefixes: [],
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
      const path =
        getPathFromState(state, {
          ...config,
          ...options,
        }) ?? '/'

      // Apply reverse rewrites for external URLs
      const rewrites = getRewriteConfig()
      if (Object.keys(rewrites).length > 0) {
        return reverseRewrite(path, rewrites)
      }

      return path
    },
    // Add all functions to ensure the types never need to fallback.
    // This is a convenience for usage in the package.
    getActionFromState,
  }
}

export const stateCache = new Map<string, any>()

/** We can reduce work by memoizing the state by the pathname. This only works because the options (linking config) theoretically never change.  */
function getStateFromPathMemoized(path: string, options: Parameters<typeof getStateFromPath>[1]) {
  // Apply rewrites to incoming path
  const rewrites = getRewriteConfig()
  let finalPath = path

  if (Object.keys(rewrites).length > 0) {
    try {
      // Parse the path as a URL to apply rewrites
      // We need to handle both full URLs and paths
      const isFullUrl = path.startsWith('http://') || path.startsWith('https://')
      const url = isFullUrl ? new URL(path) : new URL(path, 'http://temp')

      const rewrittenUrl = applyRewrites(url, rewrites)
      if (rewrittenUrl) {
        finalPath = rewrittenUrl.pathname + rewrittenUrl.search
      }
    } catch (err) {
      // If URL parsing fails, use original path
      console.warn('Failed to apply rewrites to path:', err)
    }
  }

  // Cache with original path as key
  const cached = stateCache.get(path)
  if (cached) {
    return cached
  }
  const result = getStateFromPath(finalPath, options)
  stateCache.set(path, result)
  return result
}
