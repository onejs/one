import type { OneRouter } from '../interfaces/router'
import {
  getLinkingConfig as createLinkingConfig,
  type OneLinkingOptions,
} from './getLinkingConfig'
import type { RouteNode } from './Route'
import { parseUnmaskFromPath } from './routeMask'

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

      // @modified - Route masking support
      // Priority: 1. _unmask search param (SSR-safe), 2. __tempLocation in history.state (client-only)
      let path = initialLocation.pathname + (initialLocation.search || '')

      // Check for unmask postfix in pathname first (works on both server and client)
      // e.g. /photos/3__L3Bob3Rvcy8zL21vZGFs → actual route /photos/3/modal
      const unmaskPath = parseUnmaskFromPath(initialLocation.pathname)
      if (unmaskPath) {
        path = unmaskPath
      } else if (typeof window !== 'undefined') {
        // Fall back to history.state check (client-only, not available on native)
        const historyState = window.history?.state
        if (historyState?.__tempLocation?.pathname && !historyState.__tempKey) {
          // Restore to actual route from __tempLocation
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
