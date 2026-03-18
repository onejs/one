import { useNavigationContainerRef } from '@react-navigation/native'
import { resetLoaderState } from '../useLoader'
import type { One } from '../vite/types'
import * as routerStore from './router'
import { initialize } from './router'

// per-request initialization tracking via a simple counter
// each SSR request increments the version so the router re-initializes
let initVersion = 0
let lastInitVersion = -1

export function useInitializeOneRouter(
  context: One.RouteContext,
  initialLocation: URL | undefined
) {
  const navigationRef = useNavigationContainerRef()

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
export function resetState() {
  prepareForSSRRender()
  resetLoaderState()
}

globalThis['__vxrnresetState'] = resetState
