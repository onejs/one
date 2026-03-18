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

export function getLinking() {
  return linkingConfig
}

export function setLinking(_: OneLinkingOptions) {
  linkingConfig = _
}

export function resetLinking() {
  linkingConfig = undefined
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
