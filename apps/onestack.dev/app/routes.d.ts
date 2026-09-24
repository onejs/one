// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/(content)`
        | `/(content)/blog`
        | `/(content)/docs`
        | `/(content)/native`
        | `/(content)/native/`
        | `/(content)/plans`
        | `/_sitemap`
        | `/blog`
        | `/docs`
        | `/native`
        | `/native/`
        | `/plans`
        | `/test`
      DynamicRoutes:
        | `/(content)/blog/${OneRouter.SingleRoutePart<T>}`
        | `/(content)/docs/${OneRouter.SingleRoutePart<T>}`
        | `/(content)/native/${OneRouter.SingleRoutePart<T>}`
        | `/(content)/plans/${OneRouter.SingleRoutePart<T>}`
        | `/blog/${OneRouter.SingleRoutePart<T>}`
        | `/docs/${OneRouter.SingleRoutePart<T>}`
        | `/native/${OneRouter.SingleRoutePart<T>}`
        | `/plans/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/(content)/blog/[slug]`
        | `/(content)/docs/[slug]`
        | `/(content)/native/[slug]`
        | `/(content)/plans/[slug]`
        | `/blog/[slug]`
        | `/docs/[slug]`
        | `/native/[slug]`
        | `/plans/[slug]`
      IsTyped: true
      RouteTypes: {
        '/(content)/blog/[slug]': RouteInfo<{ slug: string }>
        '/(content)/docs/[slug]': RouteInfo<{ slug: string }>
        '/(content)/native/[slug]': RouteInfo<{ slug: string }>
        '/(content)/plans/[slug]': RouteInfo<{ slug: string }>
        '/blog/[slug]': RouteInfo<{ slug: string }>
        '/docs/[slug]': RouteInfo<{ slug: string }>
        '/native/[slug]': RouteInfo<{ slug: string }>
        '/plans/[slug]': RouteInfo<{ slug: string }>
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