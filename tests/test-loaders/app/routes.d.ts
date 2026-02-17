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
        | `/error-test`
        | `/error-test/`
        | `/loader`
        | `/loader-redirect`
        | `/loader-refetch`
        | `/loader-refetch/spa`
        | `/loader-refetch/ssr`
        | `/loader-state/page1`
        | `/loader-state/page2`
        | `/loader/other`
        | `/matches-test`
        | `/matches-test/hooks-test`
        | `/matches-test/page1`
        | `/matches-test/page2`
        | `/matches-test/spa-page`
        | `/matches-test/ssr-page`
        | `/nested-test`
        | `/nested-test/level2`
        | `/nested-test/level2/page`
        | `/not-found/deep`
        | `/not-found/test`
        | `/posts`
        | `/refactor-test`
        | `/refetch-test`
        | `/shared-cache`
        | `/simple-refetch`
        | `/simple-spa-refetch`
        | `/test-refetch`
        | `/test-refetch-ssr`
      DynamicRoutes: 
        | `/not-found/deep/${OneRouter.SingleRoutePart<T>}`
        | `/not-found/fallback/${OneRouter.SingleRoutePart<T>}`
        | `/posts/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/not-found/deep/[slug]`
        | `/not-found/fallback/[slug]`
        | `/posts/[slug]`
      IsTyped: true
      RouteTypes: {
        '/not-found/deep/[slug]': RouteInfo<{ slug: string }>
        '/not-found/fallback/[slug]': RouteInfo<{ slug: string }>
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