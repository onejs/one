import type React from 'react'
import { createContext, useRef } from 'react'
import type { UrlObject } from './getNormalizedStatePath'
import { useStateForPath } from '@react-navigation/core'
import { getRouteInfo } from './getRouteInfo'

export const RouteInfoContext = createContext<UrlObject | undefined>(undefined)

/**
 * Provides the route info (a `UrlObject`) through a context for child page.
 * Such context can be used to implement hooks such as `usePathname`.
 *
 * **IMPORTANT**: The current implementation uses `useStateForPath` - which will not return the a complete state if it isn't being called from a component under a leaf route node.
 * In other words, the provided route info may not be correct when used in a `_layout`. For example, if the user is on a page `/blog/123`:
 *
 * ```
 * app
 * ├── _layout.tsx
 * ├── index.tsx
 * └── blog
 *     ├── _layout.tsx - in BlogLayout, pathname will be "/blog"
 *     └── [id].tsx - in BlogPage, pathname will be "/blog/123"
 * ```
 *
 * The returned value is lazily calculated and cached, so we won't waste CPU cycles to calculate it if no one is asking for it.
 *
 * This is implemented with the `useStateForPath` hook provided by React Navigation, which is known to be safe for not returning a stale or incomplete state when used in pages. See: https://github.com/react-navigation/react-navigation/pull/12521
 */
export function RouteInfoContextProvider({ children }: { children: React.ReactNode }) {
  const currentState = useStateForPath()

  /**
   * Ref to hold the current state. Do not update it immediately, because we also
   * rely on this ref to make `lazilyCalculatedRouteInfo` a new object when the
   * state changes.
   */
  const currentStateRef = useRef<typeof currentState>(undefined)

  /**
   * This is used by the lazilyCalculatedRouteInfo to determine if it should
   * update the cached route info. After doing so, lazilyCalculatedRouteInfo
   * should update it to the current state.
   */
  const lastStateRef = useRef<typeof currentState>(undefined)
  const cachedRouteInfoValueRef = useRef<UrlObject | undefined>(undefined)

  const lazilyCalculatedRouteInfo = useRef<UrlObject | undefined>()

  if (currentState && currentStateRef.current !== currentState) {
    lazilyCalculatedRouteInfo.current = makeLazilyCalculatedRouteInfo({
      currentStateRef,
      lastStateRef,
      cachedRouteInfoValueRef,
    })
  }
  currentStateRef.current = currentState

  return (
    <RouteInfoContext.Provider value={currentState ? lazilyCalculatedRouteInfo.current : undefined}>
      {children}
    </RouteInfoContext.Provider>
  )
}

function makeLazilyCalculatedRouteInfo({
  currentStateRef,
  lastStateRef,
  cachedRouteInfoValueRef,
}: {
  currentStateRef: React.MutableRefObject<ReturnType<typeof useStateForPath> | undefined>
  lastStateRef: React.MutableRefObject<ReturnType<typeof useStateForPath> | undefined>
  cachedRouteInfoValueRef: React.MutableRefObject<UrlObject | undefined>
}) {
  return new Proxy({} as any, {
    get(_, p: keyof UrlObject) {
      const state = currentStateRef.current
      if (!state) {
        // This should not happen because in the `RouteInfoContext.Provider` we
        // should only provide lazilyCalculatedRouteInfo if state is not undefined.
        throw new Error('[lazilyCalculatedRouteInfo] cannot get state')
      }

      // Update the cached route info if it's outdated
      if (!cachedRouteInfoValueRef.current || lastStateRef.current !== state) {
        cachedRouteInfoValueRef.current = getRouteInfo(state)
        lastStateRef.current = state
      }

      return cachedRouteInfoValueRef.current![p]
    },
  })
}
