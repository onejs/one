// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | `/`
        | `/(site)`
        | `/(site)/`
        | `/(site)/docs`
        | `/(site)/docs/`
        | `/_sitemap`
        | `/docs`
        | `/docs/`
      DynamicRoutes: 
        | `/(site)/docs/${string}`
        | `/docs/${string}`
      DynamicRouteTemplate: 
        | `/(site)/docs/[...slug]`
        | `/docs/[...slug]`
      IsTyped: true
      RouteTypes: {
        '/(site)/docs/[...slug]': RouteInfo<{ slug: string[] }>
        '/docs/[...slug]': RouteInfo<{ slug: string[] }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; search?: string; subdomain?: string; params: Params; request?: Request }
}