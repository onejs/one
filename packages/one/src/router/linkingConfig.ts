import { isWebClient } from '../constants'
import type { OneRouter } from '../interfaces/router'
import type { OneLinkingConfig } from '../link/getLinking'
import { evictOldest } from '../utils/evictOldest'
import {
  clearStateCache,
  getLinkingConfig as createLinkingConfig,
  type OneLinkingOptions,
} from './getLinkingConfig'
import type { RouteNode } from './Route'

let linkingConfig: OneLinkingOptions | undefined

// cache the base linking config (route-tree dependent, not URL-dependent)
let cachedBaseLinkingConfig: OneLinkingOptions | undefined
let cachedRouteNodeForLinking: RouteNode | null = null
let cachedLinkingConfigKey = ''

// cache getStateFromPath results by path for SSR performance
// same path always produces the same navigation state (route tree is static in prod)
const ssrStateCache = new Map<string, OneRouter.ResultState | undefined>()

export function getResolvedLinking() {
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
export function ensureBaseLinkingConfig(
  routeNode: RouteNode | null,
  linking?: OneLinkingConfig
) {
  const linkingConfigKey = getLinkingConfigKey(linking)
  if (
    routeNode &&
    (routeNode !== cachedRouteNodeForLinking ||
      linkingConfigKey !== cachedLinkingConfigKey ||
      !cachedBaseLinkingConfig)
  ) {
    // route tree or linking config changed — drop memoized navigation states
    // so getStateFromPathMemoized doesn't return entries computed against
    // the previous configuration
    clearStateCache()
    ssrStateCache.clear()
    cachedBaseLinkingConfig = createLinkingConfig(routeNode, true, linking)
    cachedRouteNodeForLinking = routeNode
    cachedLinkingConfigKey = linkingConfigKey
  }
}

/**
 * Compute initialState from a URL path, with caching for SSR.
 * Does not modify the global linkingConfig.
 */
export function getSSRInitialState(
  routeNode: RouteNode | null,
  initialLocation: URL,
  linking?: OneLinkingConfig
): OneRouter.ResultState | undefined {
  if (!routeNode) return undefined

  ensureBaseLinkingConfig(routeNode, linking)
  if (!cachedBaseLinkingConfig) return undefined

  const path = initialLocation.pathname + (initialLocation.search || '')
  if (ssrStateCache.has(path)) return ssrStateCache.get(path)

  const state = cachedBaseLinkingConfig.getStateFromPath?.(
    path,
    cachedBaseLinkingConfig.config
  )
  evictOldest(ssrStateCache, 5000, 1000)
  ssrStateCache.set(path, state)
  return state
}

export function setupLinking(
  routeNode: RouteNode | null,
  initialLocation?: URL,
  linking?: OneLinkingConfig
): OneRouter.ResultState | undefined {
  let initialState: OneRouter.ResultState | undefined

  if (routeNode) {
    // reuse ensureBaseLinkingConfig to avoid duplicating cache logic
    ensureBaseLinkingConfig(routeNode, linking)

    // shallow copy so per-request mutations (getInitialURL) don't affect cache
    linkingConfig = { ...cachedBaseLinkingConfig! }

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

// each unique filter function gets a stable id so reference-equal filters
// share a cache key while distinct filters invalidate it
const filterIds = new WeakMap<NonNullable<OneLinkingConfig['filter']>, number>()
let filterIdCounter = 0
function getFilterId(filter: OneLinkingConfig['filter']) {
  if (!filter) return 0
  let id = filterIds.get(filter)
  if (id === undefined) {
    id = ++filterIdCounter
    filterIds.set(filter, id)
  }
  return id
}

function getLinkingConfigKey(linking: OneLinkingConfig | undefined) {
  // sort prefixes/schemes so ordering doesn't cause spurious cache misses
  const schemes = Array.isArray(linking?.scheme)
    ? [...linking.scheme].sort()
    : (linking?.scheme ?? null)
  const prefixes = linking?.prefixes ? [...linking.prefixes].sort() : null
  return JSON.stringify({
    scheme: schemes,
    prefixes,
    filterId: getFilterId(linking?.filter),
  })
}
