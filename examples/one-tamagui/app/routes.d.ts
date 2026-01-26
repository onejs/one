// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/photos` | `/photos/`
      DynamicRoutes: `/photos/${OneRouter.SingleRoutePart<T>}` | `/photos/${OneRouter.SingleRoutePart<T>}/modal`
      DynamicRouteTemplate: `/photos/[id]` | `/photos/[id]/modal`
      IsTyped: true
      RouteTypes: {
        '/photos/[id]': RouteInfo<{ id: string }>
        '/photos/[id]/modal': RouteInfo<{ id: string }>
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