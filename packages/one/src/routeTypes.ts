import type { WarmStartOptions } from './router/warmStateShared'

export namespace One {
  export type RouteRenderMode = 'ssg' | 'spa' | 'ssr'

  export type RouteType = RouteRenderMode | 'api' | 'layout'

  export type ClientData = Record<string, any>

  export type RouteOptions = {
    routeModes?: Record<string, RouteRenderMode>
  }

  export interface RouteContext {
    keys(): string[]
    (id: string): any;
    <T>(id: string): T
    resolve(id: string): string
    id: string
  }

  export type RouteMatch = {
    /** Route identifier (e.g., "docs/_layout" or "docs/intro") */
    routeId: string
    /** The pathname segment this route matched */
    pathname: string
    /** URL params extracted for this route */
    params: Record<string, string | string[]>
    /** Data returned from this route's loader */
    loaderData: unknown
  }

  export type ServerContext = {
    css?: string[]
    /** When inlineLayoutCSS is enabled, this contains the actual CSS content to inline */
    cssContents?: string[]
    /** Number of inline CSS entries - used for hydration matching when cssContents is stripped */
    cssInlineCount?: number
    postRenderData?: any
    loaderData?: any
    loaderProps?: any
    mode?: 'spa' | 'ssg' | 'ssr' | 'spa-shell'
    // route keys the client loads and registers before hydrating
    routePreloads?: string[]
    /**
     * All matched routes with their loader data.
     * Ordered from root layout to leaf page (parent → child).
     */
    matches?: RouteMatch[]
  }

  export type Flags = {
    warmStart?: boolean | WarmStartOptions
  }

  export type SitemapChangefreq =
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'

  export type RouteSitemap = {
    /**
     * Priority for this route (0.0 to 1.0).
     */
    priority?: number
    /**
     * Change frequency for this route.
     */
    changefreq?: SitemapChangefreq
    /**
     * Last modification date for this route.
     */
    lastmod?: string | Date
    /**
     * Exclude this route from the sitemap.
     */
    exclude?: boolean
  }
}
