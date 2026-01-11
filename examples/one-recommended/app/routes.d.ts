// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(feed)` | `/(feed)/` | `/_sitemap` | `/notifications` | `/profile`
      DynamicRoutes: `/(feed)/post/${OneRouter.SingleRoutePart<T>}` | `/post/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(feed)/post/[id]` | `/post/[id]`
      IsTyped: true
      RouteTypes: {
        '/(feed)/post/[id]': RouteInfo<{ id: string }>
        '/post/[id]': RouteInfo<{ id: string }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; params: Params; request?: Request }
}