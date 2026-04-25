import React, { createContext, type ReactNode, useContext } from 'react'
import { findFocusedRoute } from '../fork/findFocusedRoute'
import type { ErrorBoundaryProps } from '../views/Try'
import type { LoaderProps } from '../types'
import type { One } from '../vite/types'
import type { ParamValidator, RouteValidationFn } from '../validateParams'
import { getLinking } from './linkingConfig'
import { getContextKey } from './matchers'
import { mergeDynamicParams } from './params'
import { routeInfo } from './router'
import { RouteInfoContextProvider } from './RouteInfoContext'

export type DynamicConvention = {
  name: string
  deep: boolean
  notFound?: boolean
}

/** Information about an intercept route */
export type InterceptConvention = {
  /** Number of levels up (0 = same level, 1 = parent, Infinity = root) */
  levels: number
  /** The target route path being intercepted */
  targetPath: string
}

/** Slot configuration attached to a layout */
export type SlotConfig = {
  /** The slot name (e.g., "modal" from "@modal") */
  name: string
  /** The default route to render when no intercept is active */
  defaultRoute?: RouteNode
  /** All intercept routes in this slot */
  interceptRoutes: RouteNode[]
}

export type LoadedRoute = {
  ErrorBoundary?: React.ComponentType<ErrorBoundaryProps>
  default?: React.ComponentType<any>
  unstable_settings?: Record<string, any>
  getNavOptions?: (args: any) => any
  generateStaticParams?: (props: {
    params?: Record<string, string | string[]>
  }) => Record<string, string | string[]>[]
  loader?: (props: LoaderProps) => Record<string, string | string[]>[]
  /**
   * Validate route params before navigation.
   * Use with Zod, Valibot, or a custom function.
   *
   * @example
   * ```ts
   * import { z } from 'zod'
   * export const validateParams = z.object({
   *   id: z.string().uuid()
   * })
   * ```
   */
  validateParams?: ParamValidator
  /**
   * Async route validation function.
   * Runs before navigation to validate the route is accessible.
   *
   * @example
   * ```ts
   * export async function validateRoute({ params }) {
   *   const exists = await checkResourceExists(params.id)
   *   if (!exists) {
   *     return { valid: false, error: 'Resource not found' }
   *   }
   *   return { valid: true }
   * }
   * ```
   */
  validateRoute?: RouteValidationFn
}

export type RouteNode = {
  /** The type of RouteNode */
  type: One.RouteType
  /** Load a route into memory. Returns the exports from a route. */
  loadRoute: () => Partial<LoadedRoute>
  /** Loaded initial route name. */
  initialRouteName?: string
  /** nested routes */
  children: RouteNode[]
  /** Is the route a dynamic path */
  dynamic: null | DynamicConvention[]
  /** `index`, `error-boundary`, etc. */
  route: string
  /** Context Module ID, used for matching children. */
  contextKey: string
  /** Added in-memory */
  generated?: boolean
  /** Internal screens like the directory or the auto 404 should be marked as internal. */
  internal?: boolean
  /** File paths for async entry modules that should be included in the initial chunk request to ensure the runtime JavaScript matches the statically rendered HTML representation. */
  entryPoints?: string[]
  /** Parent layouts */
  layouts?: RouteNode[]
  /** Parent middlewares */
  middlewares?: RouteNode[]
  /** Server-side path to the compiled loader module (set during build) */
  loaderServerPath?: string

  /** For layouts: the render mode if specified (e.g., _layout+ssg.tsx) */
  layoutRenderMode?: One.RouteRenderMode

  // ============================================
  // Parallel Routes & Intercepting Routes
  // ============================================

  /** If this route is inside a slot directory, the slot name (e.g., "modal" from "@modal") */
  slotName?: string
  /** If this route is an intercept route, information about what it intercepts */
  intercept?: InterceptConvention
  /** For layouts: map of slot names to their configurations */
  slots?: Map<string, SlotConfig>
}

export const RouteParamsContext = createContext<
  Record<string, string | undefined> | undefined
>({})

const CurrentRouteContext = React.createContext<RouteNode | null>(null)

if (process.env.NODE_ENV !== 'production') {
  CurrentRouteContext.displayName = 'RouteNode'
}

/** Return the RouteNode at the current contextual boundary. */
export function useRouteNode(): RouteNode | null {
  return useContext(CurrentRouteContext)
}

export function useContextKey(): string {
  const node = useRouteNode()
  if (node == null) {
    throw new Error('No filename found. This is likely a bug in router.')
  }
  return getContextKey(node.contextKey)
}

/**
 * Resolve path params from the current URL using the same linking
 * config (getStateFromPath) that the router uses for navigation.
 * Returns `undefined` if linking isn't set up yet (SSR, pre-init) or
 * the URL doesn't produce a focused route with params.
 *
 * Reuses the router's existing URL-parsing rather than re-implementing
 * segment matching, so group/catch-all/index semantics stay consistent.
 */
function getParamsFromCurrentUrl(route?: {
  path?: string
  params?: Record<string, string | undefined>
}): Record<string, any> | undefined {
  const linking = getLinking()
  if (!linking?.getStateFromPath) return undefined
  const path =
    routeInfo?.unstable_globalHref ||
    route?.path ||
    (typeof window !== 'undefined' && window.location
      ? window.location.pathname + window.location.search
      : undefined)
  if (!path) return undefined
  const state = linking.getStateFromPath(path, linking.config)
  if (!state) return undefined
  const focused = findFocusedRoute(state)
  return focused?.params as Record<string, any> | undefined
}

/** Provides the matching routes and filename to the children. */
export function Route({
  children,
  node,
  route,
}: {
  children: ReactNode
  node: RouteNode
  route?: {
    path?: string
    params?: Record<string, string | undefined>
  }
}) {
  const parentParams = useContext(RouteParamsContext)

  // url is the source of truth for path params. react navigation can provide
  // a `route` whose `params` are missing or stale for the dynamic segments
  // this node expects (observed in spa-shell mode under strictmode, and when
  // navigating between sibling dynamic routes under the same layout).
  //
  // to keep useParams() aligned with the current route, recover dynamic
  // segment params by re-parsing the router path through the linking config.
  // non-dynamic params keep flowing from React Navigation.
  const resolvedParams = React.useMemo(() => {
    const rp = route?.params
    const ownParams = node.dynamic?.length
      ? mergeDynamicParams(rp, node.dynamic, getParamsFromCurrentUrl(route))
      : rp

    if (!parentParams) return ownParams
    if (!ownParams) return parentParams
    return { ...parentParams, ...ownParams }
  }, [node, parentParams, route, routeInfo?.unstable_globalHref])

  return (
    <RouteParamsContext.Provider value={resolvedParams}>
      <CurrentRouteContext.Provider value={node}>
        <RouteInfoContextProvider>{children}</RouteInfoContextProvider>
      </CurrentRouteContext.Provider>
    </RouteParamsContext.Provider>
  )
}
