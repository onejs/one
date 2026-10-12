// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/(auth)`
        | `/(auth)/(tabs)`
        | `/(auth)/(tabs)/forum`
        | `/(auth)/(tabs)/picks`
        | `/(auth)/forum`
        | `/(auth)/forum/rankings`
        | `/(auth)/picks`
        | `/(site)`
        | `/(site)/`
        | `/(site)/docs`
        | `/(site)/docs/`
        | `/(tabs)`
        | `/(tabs)/forum`
        | `/(tabs)/picks`
        | `/_sitemap`
        | `/docs`
        | `/docs/`
        | `/forum`
        | `/forum/rankings`
        | `/picks`
      DynamicRoutes:
        | `/(auth)/thread/${OneRouter.SingleRoutePart<T>}`
        | `/(site)/docs/${string}`
        | `/docs/${string}`
        | `/thread/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/(auth)/thread/[id]`
        | `/(site)/docs/[...slug]`
        | `/docs/[...slug]`
        | `/thread/[id]`
      IsTyped: true
      RouteTypes: {
        '/(auth)/thread/[id]': RouteInfo<{ id: string }>
        '/(site)/docs/[...slug]': RouteInfo<{ slug: string[] }>
        '/docs/[...slug]': RouteInfo<{ slug: string[] }>
        '/thread/[id]': RouteInfo<{ id: string }>
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