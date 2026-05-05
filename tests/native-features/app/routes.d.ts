// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | `/`
        | `/_sitemap`
        | `/color-test`
        | `/menu-test`
        | `/split-view-test`
        | `/toolbar-test`
        | `/zoom-detail`
        | `/zoom-test`
      DynamicRoutes: `/deep-link/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/deep-link/[id]`
      IsTyped: true
      RouteTypes: {
        '/deep-link/[id]': RouteInfo<{ id: string }>
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