import { useNavigationContainerRef } from '@react-navigation/native'
import type { RequireContext } from '../types'
import { initialize } from './router'
import * as routerStore from './router'

let initialized = false

export function useInitializeVXSRouter(context: RequireContext, initialLocation: URL | undefined) {
  const navigationRef = useNavigationContainerRef()

  if (!initialized) {
    initialize(context, navigationRef, initialLocation)
    initialized = true
  }

  return routerStore
}

export function resetState() {
  initialized = false
  resetReactNavigationContexts()
}

// TODO remove global
globalThis['__vxrnresetState'] = resetState

function resetReactNavigationContexts() {
  // https://github.com/expo/router/discussions/588
  // https://github.com/react-navigation/react-navigation/blob/9fe34b445fcb86e5666f61e144007d7540f014fa/packages/elements/src/getNamedContext.tsx#LL3C1-L4C1
  // React Navigation is storing providers in a global, this is fine for the first static render
  // but subsequent static renders of Stack or Tabs will cause React to throw a warning. To prevent this warning, we'll reset the globals before rendering.
  const contexts = '__react_navigation__elements_contexts'
  globalThis[contexts] = new Map<string, React.Context<any>>()
}
