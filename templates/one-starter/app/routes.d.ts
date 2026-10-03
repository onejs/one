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
        | `/auth`
        | `/auth/`
        | `/auth/login`
        | `/auth/signup/otp`
        | `/eula`
        | `/home`
        | `/home/(tabs)`
        | `/home/(tabs)/action`
        | `/home/(tabs)/feed`
        | `/home/(tabs)/feed/`
        | `/home/(tabs)/feed/make`
        | `/home/(tabs)/profile`
        | `/home/(tabs)/profile/`
        | `/home/action`
        | `/home/feed`
        | `/home/feed/`
        | `/home/feed/make`
        | `/home/profile`
        | `/home/profile/`
        | `/home/settings`
        | `/home/settings/edit-profile`
        | `/home/settings/notifications`
        | `/privacy-policy`
        | `/terms-of-service`
      DynamicRoutes:
        | `/auth/signup/${OneRouter.SingleRoutePart<T>}`
        | `/docs/${OneRouter.SingleRoutePart<T>}`
        | `/home/(tabs)/feed/post/${OneRouter.SingleRoutePart<T>}`
        | `/home/feed/post/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/auth/signup/[method]`
        | `/docs/[slug]`
        | `/home/(tabs)/feed/post/[postId]`
        | `/home/feed/post/[postId]`
      IsTyped: true
      RouteTypes: {
        '/auth/signup/[method]': RouteInfo<{ method: string }>
        '/docs/[slug]': RouteInfo<{ slug: string }>
        '/home/(tabs)/feed/post/[postId]': RouteInfo<{ postId: string }>
        '/home/feed/post/[postId]': RouteInfo<{ postId: string }>
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
