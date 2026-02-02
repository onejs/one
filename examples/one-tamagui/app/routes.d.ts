// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/@modal/default` | `/_sitemap` | `/photos` | `/photos/` | `/settings` | `/settings/` | `/settings/account` | `/settings/account/` | `/settings/account/@modal/(..)profile` | `/settings/account/@modal/default` | `/settings/profile`
      DynamicRoutes: `/@modal/(.)photos/${OneRouter.SingleRoutePart<T>}` | `/photos/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/@modal/(.)photos/[id]` | `/photos/[id]`
      IsTyped: true
      RouteTypes: {
        '/@modal/(.)photos/[id]': RouteInfo<{ id: string }>
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