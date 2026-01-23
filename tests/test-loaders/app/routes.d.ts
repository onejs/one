// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/error-test` | `/error-test/` | `/loader` | `/loader-redirect` | `/loader-refetch` | `/loader-refetch/spa` | `/loader-refetch/ssr` | `/loader-state/page1` | `/loader-state/page2` | `/loader/other` | `/matches-test` | `/matches-test/page1` | `/matches-test/page2` | `/nested-test` | `/nested-test/level2` | `/nested-test/level2/page` | `/posts` | `/refactor-test` | `/refetch-test` | `/shared-cache` | `/simple-refetch` | `/simple-spa-refetch` | `/test-refetch` | `/test-refetch-ssr`
      DynamicRoutes: `/posts/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/posts/[slug]`
      IsTyped: true
      RouteTypes: {
        '/posts/[slug]': RouteInfo<{ slug: string }>
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