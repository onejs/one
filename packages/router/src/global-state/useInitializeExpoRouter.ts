import { useNavigationContainerRef } from '@react-navigation/native'
import type { RequireContext } from '../types'
import { store } from './router-store'

let initialize

export function useInitializeExpoRouter(context: RequireContext, initialLocation: URL | undefined) {
  const navigationRef = useNavigationContainerRef()

  if (!initialize) {
    store.initialize(context, navigationRef, initialLocation)
    initialize = true
  }

  return store
}

export function reset() {
  initialize = null
}
