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
        | `/action`
        | `/action/`
        | `/native`
        | `/notifications`
        | `/notifications/`
        | `/profile`
        | `/profile/`
        | `/split`
      DynamicRoutes:
        | `/notifications/post/${OneRouter.SingleRoutePart<T>}`
        | `/post/${OneRouter.SingleRoutePart<T>}`
        | `/profile/post/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/notifications/post/[id]`
        | `/post/[id]`
        | `/profile/post/[id]`
      IsTyped: true
      RouteTypes: {
        '/notifications/post/[id]': RouteInfo<{ id: string }>
        '/post/[id]': RouteInfo<{ id: string }>
        '/profile/post/[id]': RouteInfo<{ id: string }>
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