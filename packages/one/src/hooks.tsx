import React, { createContext, useContext, type ReactNode } from 'react'
import type { OneRouter } from './interfaces/router'
import { router } from './router/imperative-api'
import { RouteParamsContext, useRouteNode } from './router/Route'
import { navigationRef, useStoreRootState, useStoreRouteInfo } from './router/router'
import { RouteInfoContext } from './router/RouteInfoContext'

type SearchParams = OneRouter.SearchParams

export function useRootNavigationState() {
  return useStoreRootState()
}

export function useRouteInfo() {
  // This uses the `useStateForPath` hook under the hood, which will be always correct
  // when used in a page, but will not be correct when used in a layout.
  // See the comment in `RouteInfoContext` for more details.
  const routeInfoFromContext = useContext(RouteInfoContext)

  // This uses `navigationRef.getRootState()` under the hood, which has the
  // issue of returning an incomplete state during the first render of nested navigators.
  // See: https://github.com/react-navigation/react-navigation/pull/12521#issue-2958644406
  const routeInfoFromRootState = useStoreRouteInfo()

  const routeNode = useRouteNode()

  if (routeNode?.type === 'layout') {
    // We are in a layout, do not consider using `RouteInfoContextProvider`.
    return routeInfoFromRootState
  }

  // We are in a page, prioritize `routeInfoFromContext` over `routeInfoFromRootState` because it is more accurate.
  return routeInfoFromContext || routeInfoFromRootState
}

/** @return the root `<NavigationContainer />` ref for the app. The `ref.current` may be `null` if the `<NavigationContainer />` hasn't mounted yet. */
export function useNavigationContainerRef() {
  return navigationRef
}

const FrozeContext = createContext(false)

export function Frozen({ on = false, children }: { on?: boolean; children: ReactNode }) {
  // useEffect(() => {
  //   enableFreeze(true)
  //   return () => {
  //     enableFreeze(false)
  //   }
  // }, [on])

  if (typeof window === 'undefined') {
    return children
  }

  return (
    <FrozeContext.Provider value={on}>
      {/* <Freeze freeze={on}> */}
      <div
        // @ts-ignore
        inert
        style={{ display: 'contents' }}
      >
        {children}
      </div>
      {/* </Freeze> */}
    </FrozeContext.Provider>
  )
}

export function useRouter(): OneRouter.Router {
  return router
}

/**
 * @private
 * @returns the current global pathname with query params attached. This may change in the future to include the hostname from a predefined universal link, i.e. `/foobar?hey=world` becomes `https://acme.dev/foobar?hey=world`
 */
export function useUnstableGlobalHref(): string {
  return useRouteInfo().unstable_globalHref
}

/**
 * Get a list of selected file segments for the currently selected route. Segments are not normalized, so they will be the same as the file path. e.g. /[id]?id=normal -> ["[id]"]
 *
 * `useSegments` can be typed using an abstract.
 * Consider the following file structure, and strictly typed `useSegments` function:
 *
 * ```md
 * - app
 *   - [user]
 *     - index.js
 *     - followers.js
 *   - settings.js
 * ```
 * This can be strictly typed using the following abstract:
 *
 * ```ts
 * const [first, second] = useSegments<['settings'] | ['[user]'] | ['[user]', 'followers']>()
 * ```
 */
export function useSegments<TSegments extends string[] = string[]>(): TSegments {
  return useRouteInfo().segments as TSegments
}

/** @returns global selected pathname without query parameters. */
export function usePathname(): string {
  return useRouteInfo().pathname
}

/**
 * Get the globally selected query parameters, including dynamic path segments. This function will update even when the route is not focused.
 * Useful for analytics or other background operations that don't draw to the screen.
 *
 * When querying search params in a stack, opt-towards using `useParams` as these will only
 * update when the route is focused.
 *
 * @see `useParams`
 */
export function useActiveParams<
  TParams extends Object = SearchParams
>(): Partial<TParams> {
  return useRouteInfo().params as Partial<TParams>
}

/** @deprecated @see `useParams` */
export const useLocalSearchParams = useParams

/** @deprecated @see `useActiveParams` */
export const useGlobalSearchParams = useActiveParams

/**
 * Returns the URL search parameters for the contextually focused route. e.g. `/acme?foo=bar` -> `{ foo: "bar" }`.
 * This is useful for stacks where you may push a new screen that changes the query parameters.
 *
 * To observe updates even when the invoking route is not focused, use `useActiveParams()`.
 */

export function useParams<TParams extends Object = SearchParams>(): Partial<TParams> {
  const params = React.useContext(RouteParamsContext) ?? {}

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [
          key,
          value.map((v) => {
            try {
              return decodeURIComponent(v)
            } catch {
              return v
            }
          }),
        ]
      }
      try {
        return [key, decodeURIComponent(value as string)]
      } catch {
        return [key, value]
      }
    })
  ) as TParams
}
