// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/photos` | `/photos/` | `/settings` | `/settings/` | `/settings/account` | `/settings/account/` | `/settings/profile`
      DynamicRoutes: `/photos/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/photos/[id]`
      IsTyped: true
      RouteTypes: {
        '/photos/[id]': RouteInfo<{ id: string }>
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