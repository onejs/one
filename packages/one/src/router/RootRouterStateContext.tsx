import { createContext, useRef, useSyncExternalStore } from 'react'
import { type NavigationState, useNavigation } from '@react-navigation/core'
import type { UrlObject } from './getNormalizedStatePath'
import { getRouteInfo } from './router'

export const RootRouterStateContext = createContext<NavigationState | undefined>(
  undefined
)
export const RouteInfoContext = createContext<UrlObject | undefined>(undefined)

export function RootRouterStateContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const rootNavigation = useNavigation()

  const state = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribe = rootNavigation.addListener('state', onStoreChange)

      return () => {
        unsubscribe()
      }
    },
    rootNavigation.getState,
    rootNavigation.getState
  )

  const currentState = useRef<typeof state>(state)
  currentState.current = state
  const routeInfoBasedState = useRef<typeof state>(state)
  const routeInfoValue = useRef<UrlObject | undefined>(undefined)

  console.log('state, ', state)

  const lazilyCalculatedRouteInfo = useRef<UrlObject>(
    new Proxy({} as any, {
      get(_, p: keyof UrlObject) {
        const s = currentState.current
        if (!s) {
          // This should not happen because in the RouteInfoContext.Provider
          // below, we only provide lazilyCalculatedRouteInfo if state is not
          // undefined.
          throw new Error(
            '[lazilyCalculatedRouteInfo] Cannot get state. This should not happen.'
          )
        }

        // Update the cached route info if it's outdated
        if (!routeInfoValue.current || routeInfoBasedState.current !== s) {
          console.log('updating routeInfoValue')
          routeInfoValue.current = getRouteInfo(s as any)
          routeInfoBasedState.current = s
        }
        console.log('routeInfoValue is ', routeInfoValue.current)

        return routeInfoValue.current![p]
      },
    })
  ).current

  return (
    <RootRouterStateContext.Provider value={state}>
      <RouteInfoContext.Provider value={state ? lazilyCalculatedRouteInfo : undefined}>
        {children}
      </RouteInfoContext.Provider>
    </RootRouterStateContext.Provider>
  )
}
