import React, { createContext, type ReactNode, useContext } from 'react'
import type { OneRouter } from './interfaces/router'
import { router } from './router/imperative-api'
import { RouteParamsContext, useRouteNode } from './router/Route'
import { RouteInfoContext } from './router/RouteInfoContext'
import { navigationRef, useStoreRootState, useStoreRouteInfo } from './router/router'

type SearchParams = OneRouter.SearchParams

/**
 * Returns the root navigation state from the NavigationContainer.
 *
 * @returns The root navigation state object
 * @link https://onestack.dev/docs/api/hooks/useRootNavigationState
 */
export function useRootNavigationState() {
  return useStoreRootState()
}

/**
 * Returns the current route information including pathname, params, and segments.
 * Automatically handles layout vs page context for accurate route info.
 *
 * @returns Route info object with pathname, params, segments, and more
 * @link https://onestack.dev/docs/api/hooks/useRouteInfo
 */
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
      <div {...(on && { inert: true })} style={{ display: 'contents' }}>
        {children}
      </div>
      {/* </Freeze> */}
    </FrozeContext.Provider>
  )
}

/**
 * Returns the imperative router API for programmatic navigation.
 *
 * @returns Router object with navigate, push, replace, back, and more
 * @link https://onestack.dev/docs/api/hooks/useRouter
 *
 * @example
 * ```tsx
 * const router = useRouter()
 * router.push('/settings')
 * router.back()
 * ```
 */
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
 * Returns route segments as an array matching the file path structure.
 * Segments are not resolved, so dynamic segments appear as `[id]` not their values.
 *
 * @returns Array of path segments
 * @link https://onestack.dev/docs/api/hooks/useSegments
 *
 * @example
 * ```tsx
 * // File: app/users/[id]/settings.tsx
 * // URL: /users/123/settings
 * const segments = useSegments()
 * // Returns: ['users', '[id]', 'settings']
 * ```
 *
 * @example Typed segments
 * ```ts
 * type AppSegments = ['settings'] | ['[user]'] | ['[user]', 'followers']
 * const [first, second] = useSegments<AppSegments>()
 * ```
 */
export function useSegments<TSegments extends string[] = string[]>(): TSegments {
  return useRouteInfo().segments as TSegments
}

/**
 * Returns the current pathname without query parameters or hash.
 *
 * @returns The pathname string (e.g., '/users/123')
 * @link https://onestack.dev/docs/api/hooks/usePathname
 *
 * @example
 * ```tsx
 * // URL: /users/123?tab=settings#section
 * const pathname = usePathname()
 * // Returns: '/users/123'
 * ```
 */
export function usePathname(): string {
  return useRouteInfo().pathname
}

/**
 * Returns URL parameters globally, updating even when the route is not focused.
 * Useful for analytics, background sync, or global UI like breadcrumbs.
 *
 * For most component use cases, prefer `useParams` which only updates when focused.
 *
 * @returns Object containing URL parameters
 * @link https://onestack.dev/docs/api/hooks/useActiveParams
 * @see useParams for focus-aware params
 */
export function useActiveParams<
  TParams extends object = SearchParams,
>(): Partial<TParams> {
  return useRouteInfo().params as Partial<TParams>
}

/** @deprecated @see `useParams` */
export const useLocalSearchParams = useParams

/** @deprecated @see `useActiveParams` */
export const useGlobalSearchParams = useActiveParams

/**
 * Returns URL parameters for the focused route, including dynamic segments and query params.
 * Only updates when this route is focused - ideal for stack navigators.
 *
 * @returns Object containing URL parameters (values are URL-decoded)
 * @link https://onestack.dev/docs/api/hooks/useParams
 * @see useActiveParams for global params that update even when unfocused
 *
 * @example
 * ```tsx
 * // Route: /users/[id].tsx
 * // URL: /users/123?tab=settings
 * const { id, tab } = useParams<{ id: string; tab?: string }>()
 * // id = '123', tab = 'settings'
 * ```
 */
export function useParams<TParams extends object = SearchParams>(): Partial<TParams> {
  const params = React.useContext(RouteParamsContext) ?? {}

  return Object.fromEntries(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
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
