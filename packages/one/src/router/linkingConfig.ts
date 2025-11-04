import type { OneRouter } from '../interfaces/router'
import { getLinkingConfig as createLinkingConfig, type OneLinkingOptions } from './getLinkingConfig'
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
      initialState = linkingConfig.getStateFromPath?.(
        initialLocation.pathname + (initialLocation.search || ''),
        linkingConfig.config
      )
    }
  }

  return initialState
}
