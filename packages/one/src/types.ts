import type { One } from './vite/types'

/** The list of input keys will become optional, everything else will remain the same. */
export type PickPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type GlobbedRouteImports = Record<string, () => Promise<unknown>>

export type Endpoint = (req: Request) => Response | string | object | null

export type RenderApp = (props: RenderAppProps) => Promise<string>

export type LoaderProps<
  Params extends object = Record<string, string | string[]>,
  SearchParams extends object | undefined = undefined,
> = {
  path: string
  search?: string
  subdomain?: string
  params: Params
  request?: Request
} & ([SearchParams] extends [object]
  ? {
      /**
       * the query, validated by the schemas components under this route pass to
       * `useSearchParams(schema)`. Present on ssr document and query-aware client
       * loader requests, absent for build-time ssg and spa loaders. Native production
       * initial loads use static data; refetch requests carry the query.
       */
      searchParams?: SearchParams
    }
  : {})

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
  routePreloads?: string[]
  /**
   * All matched routes with their loader data.
   * Ordered from root layout to leaf page (parent → child).
   */
  matches?: One.RouteMatch[]
}
