import type React from 'react'
import { createContext, useRef } from 'react'
import type { UrlObject } from './getNormalizedStatePath'
import { useStateForPath } from '@react-navigation/core'
import { getRouteInfo } from './router'

export const RouteInfoContext = createContext<UrlObject | undefined>(undefined)

export function RouteInfoContextProvider({ children }: { children: React.ReactNode }) {
  const stateForPath = useStateForPath()

  const routeInfoBasedState = useRef<typeof stateForPath>(stateForPath)
  const routeInfoValue = useRef<UrlObject | undefined>(undefined)

  const lazilyCalculatedRouteInfo = useRef<UrlObject>(
    new Proxy({} as any, {
      get(_, p: keyof UrlObject) {
        if (!stateForPath) {
          // This should not happen because in the RouteInfoContext.Provider
          // below, we only provide lazilyCalculatedRouteInfo if stateForPath
          // is there.
          throw new Error('[lazilyCalculatedRouteInfo] cannot get stateForPath')
        }

        // Update the cached route info if it's outdated
        if (!routeInfoValue.current || routeInfoBasedState.current !== stateForPath) {
          routeInfoValue.current = getRouteInfo(stateForPath)
          routeInfoBasedState.current = stateForPath
        }

        return routeInfoValue.current![p]
      },
    })
  ).current

  return (
    <RouteInfoContext.Provider
      value={stateForPath ? lazilyCalculatedRouteInfo : undefined}
    >
      {children}
    </RouteInfoContext.Provider>
  )
}
