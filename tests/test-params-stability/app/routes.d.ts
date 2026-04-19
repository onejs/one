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
        | `/_sitemap`
      DynamicRoutes: 
        | `/(site)/preview/${OneRouter.SingleRoutePart<T>}`
        | `/preview/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/(site)/preview/[id]`
        | `/preview/[id]`
      IsTyped: true
      RouteTypes: {
        '/(site)/preview/[id]': RouteInfo<{ id: string }>
        '/preview/[id]': RouteInfo<{ id: string }>
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