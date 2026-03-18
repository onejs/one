import { useNavigationContainerRef } from '@react-navigation/native'
import { resetLoaderState } from '../useLoader'
import type { One } from '../vite/types'
import type { OneRouter } from '../interfaces/router'
import * as routerStore from './router'
import { initialize, initializeSSR } from './router'

let initialized = false

export function useInitializeOneRouter(
  context: One.RouteContext,
  initialLocation: URL | undefined
) {
  const navigationRef = useNavigationContainerRef()
  let ssrInitialState: OneRouter.ResultState | undefined

  if (typeof window === 'undefined') {
    // SSR: route tree + root component initialized once, per-request state computed fresh
    if (!initialized) {
      const contexts = '__react_navigation__elements_contexts'
      globalThis[contexts] = new Map<string, React.Context<any>>()
      initialize(context, navigationRef, initialLocation)
      initialized = true
    }
    // always compute fresh state for this request's URL (concurrency-safe)
    ssrInitialState = initializeSSR(navigationRef, initialLocation)
  } else {
    // client: initialize once
    if (!initialized) {
      initialize(context, navigationRef, initialLocation)
      initialized = true
    }
  }

  return routerStore
}

export function resetState() {
  initialized = false
  resetLoaderState()
  const contexts = '__react_navigation__elements_contexts'
  globalThis[contexts] = new Map<string, React.Context<any>>()
}

globalThis['__vxrnresetState'] = resetState
