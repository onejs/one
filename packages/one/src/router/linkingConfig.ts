import { isWebClient } from '../constants'
import type { OneRouter } from '../interfaces/router'
import {
  getLinkingConfig as createLinkingConfig,
  type OneLinkingOptions,
} from './getLinkingConfig'
import type { RouteNode } from './Route'

let linkingConfig: OneLinkingOptions | undefined

// cache the base linking config (route-tree dependent, not URL-dependent)
let cachedBaseLinkingConfig: OneLinkingOptions | undefined
let cachedRouteNodeForLinking: RouteNode | null = null

// cache getStateFromPath results by path for SSR performance
// same path always produces the same navigation state (route tree is static in prod)
const ssrStateCache = new Map<string, OneRouter.ResultState | undefined>()

export function getLinking() {
  return linkingConfig
}

export function setLinking(_: OneLinkingOptions) {
  linkingConfig = _
}

export function resetLinking() {
  linkingConfig = undefined
}

/**
 * Ensure the base linking config is initialized for a given route tree.
 * Does not set any per-request state.
 */
export function ensureBaseLinkingConfig(routeNode: RouteNode | null) {
  if (routeNode && (routeNode !== cachedRouteNodeForLinking || !cachedBaseLinkingConfig)) {
    cachedBaseLinkingConfig = createLinkingConfig(routeNode)
    cachedRouteNodeForLinking = routeNode
  }
}

/**
 * Compute initialState from a URL path, with caching for SSR.
 * Does not modify the global linkingConfig.
 */
export function getSSRInitialState(
  routeNode: RouteNode | null,
  initialLocation: URL
): OneRouter.ResultState | undefined {
  if (!routeNode) return undefined

  ensureBaseLinkingConfig(routeNode)
  if (!cachedBaseLinkingConfig) return undefined

  const path = initialLocation.pathname + (initialLocation.search || '')
  const cached = ssrStateCache.get(path)
  if (cached !== undefined) return cached

  const state = cachedBaseLinkingConfig.getStateFromPath?.(path, cachedBaseLinkingConfig.config)
  // bound cache to prevent memory growth on sites with many unique URLs
  if (ssrStateCache.size > 10000) ssrStateCache.clear()
  ssrStateCache.set(path, state)
  return state
}

export function setupLinking(
  routeNode: RouteNode | null,
  initialLocation?: URL
): OneRouter.ResultState | undefined {
  let initialState: OneRouter.ResultState | undefined

  if (routeNode) {
    // cache the base config - only rebuild when route tree changes
    if (routeNode !== cachedRouteNodeForLinking || !cachedBaseLinkingConfig) {
      cachedBaseLinkingConfig = createLinkingConfig(routeNode)
      cachedRouteNodeForLinking = routeNode
    }

    // shallow copy so per-request mutations (getInitialURL) don't affect cache
    linkingConfig = { ...cachedBaseLinkingConfig }

    if (initialLocation) {
      linkingConfig.getInitialURL = () => initialLocation.toString()

      let path = initialLocation.pathname + (initialLocation.search || '')

      if (isWebClient) {
        const historyState = window.history.state
        if (historyState?.__tempLocation?.pathname && !historyState.__tempKey) {
          path =
            historyState.__tempLocation.pathname +
            (historyState.__tempLocation.search || '')
        }
      }

      initialState = linkingConfig.getStateFromPath?.(path, linkingConfig.config)
    }
  }

  return initialState
}
