import React, { createContext, useContext } from 'react'
import { isNative } from './constants'
import type { OneRouter } from './interfaces/router'
import { router } from './router/imperative-api'
import { RouteParamsContext, useRouteNode } from './router/Route'
import { mergeDynamicParams } from './router/params'
import {
  getPathnameWithRecoveredDynamicSegment,
  normalizeRoutePathname,
} from './router/path'
import { RouteInfoContext } from './router/RouteInfoContext'
import {
  navigationRef,
  routeInfo as activeRouteInfo,
  useStoreRootState,
  useStoreRouteInfo,
} from './router/router'
import {
  mergeSearchRecord,
  parseSearchRecord,
  searchRecordKey,
  stringifySearchRecord,
  toSearchRecord,
  type SearchParamsOptions,
  type SearchParamsUpdate,
  type SearchParamsUpdateOptions,
  type UseSearchParamsSchemaResult,
} from './searchParams'
import { isStandardSchema, type StandardSchemaV1 } from './standardSchema'
import { getServerContext } from './vite/one-server-only'

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

export const FrozeContext = createContext(false)

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
  const routeInfoPathname = useRouteInfo().pathname
  if (import.meta.env.SSR) {
    // on server, prefer path from per-request async local storage to avoid
    // stale module-level routeInfo between SSR renders
    try {
      const ctx = getServerContext()
      if (ctx?.loaderProps?.path) {
        return normalizeRoutePathname(ctx.loaderProps.path)
      }
    } catch {
      // no als context available, fall through
    }
  }
  return getPathnameWithRecoveredDynamicSegment(routeInfoPathname)
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
  const contextParams = React.useContext(RouteParamsContext) ?? {}
  const routeNode = useRouteNode()
  const routeInfoParams = useRouteInfo().params

  const params = React.useMemo(
    () =>
      isNative
        ? contextParams
        : mergeDynamicParams(contextParams, routeNode?.dynamic, routeInfoParams),
    [contextParams, routeInfoParams, routeNode]
  )

  return React.useMemo(() => {
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
  }, [params])
}

class ReadOnlyURLSearchParams extends URLSearchParams {
  override set(_name: string, _value: string): void {
    throw new Error('useSearchParams returns a read-only URLSearchParams object')
  }
  override append(_name: string, _value: string): void {
    throw new Error('useSearchParams returns a read-only URLSearchParams object')
  }
  override delete(_name: string, _value?: string): void {
    throw new Error('useSearchParams returns a read-only URLSearchParams object')
  }
}

/**
 * Returns URL search parameters as a read-only URLSearchParams object.
 * Use this when you need the standard web URLSearchParams API.
 *
 * @param options.global - If true, returns params that update even when route is not focused
 * @returns Read-only URLSearchParams object
 * @link https://onestack.dev/docs/api/hooks/useSearchParams
 * @see useParams for a plain object with both path and search params
 *
 * @example
 * ```tsx
 * // URL: /products?sort=price&category=electronics
 * const searchParams = useSearchParams()
 * searchParams.get('sort')      // 'price'
 * searchParams.get('category')  // 'electronics'
 * searchParams.has('sort')      // true
 * searchParams.getAll('tag')    // ['a', 'b'] for ?tag=a&tag=b
 * ```
 */
export function useSearchParams(options?: SearchParamsOptions): URLSearchParams
/**
 * Reads the query through a Standard Schema (Zod, Valibot, ArkType, any library that
 * implements https://standardschema.dev) and returns the schema's output with a
 * function that writes changes back to the URL.
 *
 * The schema receives every query key as a string, or an array of strings when the
 * key repeats. It must validate synchronously. A failed validation throws
 * `SearchValidationError` during render, which the nearest error boundary catches;
 * give the schema defaults (`.catch`, `.default`) to read a bad URL as a good one.
 * Define the schema outside the component so its output stays stable between renders.
 *
 * `update` merges into the current URL: path params, other query keys and the hash
 * are kept, and a key set to `null` or `undefined` is removed. Values are written as
 * strings, numbers, booleans or arrays of those, with a repeated key per array item.
 * It adds a history entry unless `{ replace: true }`.
 *
 * @example
 * ```tsx
 * const tableParams = z.object({ page: z.coerce.number().catch(1) })
 *
 * function Table() {
 *   const [{ page }, update] = useSearchParams(tableParams)
 *   return <button onClick={() => update({ page: page + 1 })}>Page {page}</button>
 * }
 * ```
 */
export function useSearchParams<Schema extends StandardSchemaV1<unknown, object>>(
  schema: Schema,
  options?: SearchParamsOptions
): UseSearchParamsSchemaResult<Schema>
export function useSearchParams(
  schemaOrOptions?: StandardSchemaV1 | SearchParamsOptions,
  schemaOptions?: SearchParamsOptions
): URLSearchParams | UseSearchParamsSchemaResult<StandardSchemaV1<unknown, object>> {
  const schema = isStandardSchema(schemaOrOptions) ? schemaOrOptions : undefined
  const { global = false } =
    (schema ? schemaOptions : (schemaOrOptions as SearchParamsOptions | undefined)) ?? {}

  const schemaRef = React.useRef(schema)
  const globalRef = React.useRef(global)

  if (process.env.NODE_ENV !== 'production') {
    if (global !== globalRef.current) {
      console.warn("useSearchParams: the 'global' option cannot change between renders")
    }
    if (!schema !== !schemaRef.current) {
      console.warn('useSearchParams: pass a schema on every render or on none')
    }
  }

  // the schema form is a separate hook, chosen once by whether a schema was passed
  // biome-ignore lint/correctness/useHookAtTopLevel: schema presence is stable (validated above)
  return schemaRef.current
    ? useSearchParamsSchema(
        (schema ?? schemaRef.current) as StandardSchemaV1<unknown, object>,
        global
      )
    : useSearchParamsRaw(global)
}

function useSearchParamsRaw(global: boolean): URLSearchParams {
  // biome-ignore lint/correctness/useHookAtTopLevel: global option is stable (validated above)
  const params = global ? useActiveParams() : useParams()

  return React.useMemo(() => {
    const entries = Object.entries(params).flatMap(([key, value]) => {
      if (value === undefined) return []
      return Array.isArray(value)
        ? value.map((v) => [key, String(v)] as [string, string])
        : [[key, String(value)] as [string, string]]
    })
    return new ReadOnlyURLSearchParams(entries)
  }, [params])
}

function useSearchParamsSchema<Schema extends StandardSchemaV1<unknown, object>>(
  schema: Schema,
  global: boolean
): UseSearchParamsSchemaResult<Schema> {
  // global reads the active route even from an unfocused page, which has its own route info
  const localInfo = useRouteInfo()
  const storeInfo = useStoreRouteInfo()
  const localParams = useParams()
  const localPathname = usePathname()
  const { unstable_globalHref: href, pathname: routePathname } = global
    ? storeInfo
    : localInfo
  const params = global ? (storeInfo.params as Record<string, unknown>) : localParams
  const pathname = global
    ? getPathnameWithRecoveredDynamicSegment(storeInfo.pathname)
    : localPathname

  // path params ride in the same params object as the query: keep only what the href queries
  const record = React.useMemo(() => toSearchRecord(params, href), [params, href])
  const recordKey = searchRecordKey(record)

  const output = React.useMemo(
    () => parseSearchRecord(schema, record),
    // the record is rebuilt whenever route params change; only its content matters
    // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by content
    [schema, recordKey]
  )

  // two updates in one tick both build on the first: the URL has not caught up yet
  const latest = React.useRef({ key: recordKey, record })
  if (latest.current.key !== recordKey) {
    latest.current = { key: recordKey, record }
  }

  const update = React.useCallback(
    (change: SearchParamsUpdate<Schema>, options?: SearchParamsUpdateOptions) => {
      const next = mergeSearchRecord(
        latest.current.record,
        change as Record<string, unknown>
      )
      latest.current = { key: latest.current.key, record: next }
      const query = stringifySearchRecord(next)
      // the hash belongs to the focused url: an unfocused screen writes its own route without it
      const hash = isNative || activeRouteInfo?.pathname !== routePathname ? '' : window.location.hash
      const href = `${pathname}${query ? `?${query}` : ''}${hash}`
      if (options?.replace) {
        router.replace(href as OneRouter.Href)
      } else {
        router.push(href as OneRouter.Href)
      }
    },
    [pathname, routePathname]
  )

  return [output, update] as const
}
