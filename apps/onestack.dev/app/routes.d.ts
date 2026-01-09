// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(content)` | `/(content)/blog` | `/(content)/docs` | `/_sitemap` | `/blog` | `/docs` | `/test`
      DynamicRoutes: `/(content)/blog/${OneRouter.SingleRoutePart<T>}` | `/(content)/docs/${OneRouter.SingleRoutePart<T>}` | `/blog/${OneRouter.SingleRoutePart<T>}` | `/docs/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(content)/blog/[slug]` | `/(content)/docs/[slug]` | `/blog/[slug]` | `/docs/[slug]`
      IsTyped: true
      RouteTypes: {
        '/(content)/blog/[slug]': RouteInfo<{ slug: string }>
        '/(content)/docs/[slug]': RouteInfo<{ slug: string }>
        '/blog/[slug]': RouteInfo<{ slug: string }>
        '/docs/[slug]': RouteInfo<{ slug: string }>
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