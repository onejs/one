import type { OneRouter } from '../interfaces/router'
import {
  getLinkingConfig as createLinkingConfig,
  type OneLinkingOptions,
} from './getLinkingConfig'
import type { RouteNode } from './Route'

let linkingConfig: OneLinkingOptions | undefined

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
    linkingConfig = createLinkingConfig(routeNode)

    if (initialLocation) {
      linkingConfig.getInitialURL = () => initialLocation.toString()

      // @modified - Check __tempLocation for route masking support
      // On page refresh with a masked URL, history.state contains the actual route
      let path = initialLocation.pathname + (initialLocation.search || '')
      if (typeof window !== 'undefined') {
        const historyState = window.history.state
        if (historyState?.__tempLocation?.pathname && !historyState.__tempKey) {
          // Restore to actual route from __tempLocation
          path = historyState.__tempLocation.pathname + (historyState.__tempLocation.search || '')
        }
      }

      initialState = linkingConfig.getStateFromPath?.(path, linkingConfig.config)
    }
  }

  return initialState
}
