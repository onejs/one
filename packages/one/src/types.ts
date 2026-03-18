import type { One } from './vite/types'

/** The list of input keys will become optional, everything else will remain the same. */
export type PickPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type GlobbedRouteImports = Record<string, () => Promise<unknown>>

export type Endpoint = (req: Request) => Response | string | object | null

export type RenderApp = (props: RenderAppProps) => Promise<string>

export type LoaderCacheConfig = {
  ttl?: number
}

export type LoaderProps<Params extends object = Record<string, string | string[]>> = {
  path: string
  search?: string
  params: Params
  request?: Request
  /**
   * Cache this loader's result for concurrent and/or time-based deduplication.
   * Call at the top of your loader before any async work.
   *
   * @param key - cache key (e.g. params.id)
   * @param ttlOrConfig - TTL in ms, or config object. omit to only coalesce concurrent calls.
   *
   * @example
   * ```ts
   * export async function loader({ params, cache }: LoaderProps) {
   *   cache(params.id, 100) // cache for 100ms
   *   const data = await db.getCard(params.id)
   *   return { data }
   * }
   * ```
   */
  cache?: (key: string, ttlOrConfig?: number | LoaderCacheConfig) => void
}

export type RenderAppProps = {
  mode: One.RouteRenderMode | 'spa-shell'
  path: string
  /**
   * Critical scripts that need to execute immediately (will use async).
   * These generate both modulepreload links and async script tags.
   */
  preloads?: string[]
  /**
   * Non-critical scripts that can wait (will only be modulepreload hints).
   * These only generate <link rel="modulepreload"> tags and load when imported.
   */
  deferredPreloads?: string[]
  css?: string[]
  /** When inlineLayoutCSS is enabled, this contains the actual CSS content to inline */
  cssContents?: string[]
  loaderServerData?: any
  loaderData?: any
  loaderProps?: LoaderProps
  routePreloads?: Record<string, string>
  /**
   * All matched routes with their loader data.
   * Ordered from root layout to leaf page (parent → child).
   */
  matches?: One.RouteMatch[]
}
