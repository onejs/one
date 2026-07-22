import { useNavigationContainerRef } from '@react-navigation/native'
import { resetLoaderState } from '../useLoader'
import type { One } from '../vite/types'
import type { OneLinkingConfig } from '../link/getLinking'
import * as routerStore from './router'
import { initialize } from './router'
import { getSSRInitialState, ensureBaseLinkingConfig } from './linkingConfig'

// client-side initialization tracking via a simple counter
// resetState increments the version so the router re-initializes on client
let initVersion = 0
let lastInitVersion = -1

// track whether the route tree has been initialized for SSR
let ssrRouteTreeInitialized = false

export function useInitializeOneRouter(
  context: One.RouteContext,
  initialLocation: URL | undefined,
  linking?: OneLinkingConfig
) {
  const navigationRef = useNavigationContainerRef()

  // SSR: initialize route tree once, then compute per-request state via cache
  if (typeof window === 'undefined') {
    if (!ssrRouteTreeInitialized) {
      // first SSR request: full initialization to set up route tree, root component, etc.
      initialize(context, navigationRef, initialLocation, linking)
      ssrRouteTreeInitialized = true
      // also ensure linking config base is cached
      ensureBaseLinkingConfig(routerStore.routeNode, linking)
    }

    // per-request: compute initialState from URL (cached by path)
    const initialState = initialLocation
      ? getSSRInitialState(routerStore.routeNode, initialLocation, linking)
      : routerStore.initialState

    // return per-request snapshot to prevent concurrent request trampling
    return {
      rootComponent: routerStore.rootComponent,
      navigationRef,
      initialState,
    } as unknown as typeof routerStore
  }

  // client: use version tracking (no concurrency issue)
  if (lastInitVersion !== initVersion || routerStore.navigationRef !== navigationRef) {
    // reset react navigation contexts to avoid stale provider warnings
    const contexts = '__react_navigation__elements_contexts'
    globalThis[contexts] = new Map<string, React.Context<any>>()

    initialize(context, navigationRef, initialLocation, linking)
    lastInitVersion = initVersion
  }

  return routerStore
}

// increment version to trigger re-initialization on next client render
export function prepareForSSRRender() {
  initVersion++
}

// keep backwards compat but make it lightweight
// on SSR, router state is computed per-request in useInitializeOneRouter;
// this only clears useAsyncFn caches used by layout loader fallback path
export function resetState() {
  prepareForSSRRender()
  resetLoaderState()
}

globalThis['__vxrnresetState'] = resetState
