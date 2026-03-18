import { useNavigationContainerRef } from '@react-navigation/native'
import { resetLoaderState } from '../useLoader'
import type { One } from '../vite/types'
import * as routerStore from './router'
import { initialize } from './router'
import { getSSRInitialState, ensureBaseLinkingConfig } from './linkingConfig'

// per-request initialization tracking via a simple counter
// each SSR request increments the version so the router re-initializes
let initVersion = 0
let lastInitVersion = -1

// track whether the route tree has been initialized for SSR
let ssrRouteTreeInitialized = false

export function useInitializeOneRouter(
  context: One.RouteContext,
  initialLocation: URL | undefined
) {
  const navigationRef = useNavigationContainerRef()

  // SSR: initialize route tree once, then compute per-request state via cache
  if (typeof window === 'undefined') {
    if (!ssrRouteTreeInitialized) {
      // first SSR request: full initialization to set up route tree, root component, etc.
      initialize(context, navigationRef, initialLocation)
      ssrRouteTreeInitialized = true
      // also ensure linking config base is cached
      ensureBaseLinkingConfig(routerStore.routeNode)
    }

    // per-request: compute initialState from URL (cached by path)
    const initialState = initialLocation
      ? getSSRInitialState(routerStore.routeNode, initialLocation)
      : routerStore.initialState

    // return per-request snapshot to prevent concurrent request trampling
    return {
      rootComponent: routerStore.rootComponent,
      navigationRef,
      initialState,
    } as typeof routerStore
  }

  // client: use version tracking (no concurrency issue)
  if (lastInitVersion !== initVersion) {
    // reset react navigation contexts to avoid stale provider warnings
    const contexts = '__react_navigation__elements_contexts'
    globalThis[contexts] = new Map<string, React.Context<any>>()

    initialize(context, navigationRef, initialLocation)
    lastInitVersion = initVersion
  }

  return routerStore
}

// called before each SSR render to ensure fresh router state
export function prepareForSSRRender() {
  initVersion++
}

// keep backwards compat but make it lightweight
// on SSR, no longer needs to reset router state since it's computed per-request
export function resetState() {
  prepareForSSRRender()
  resetLoaderState()
}

globalThis['__vxrnresetState'] = resetState
