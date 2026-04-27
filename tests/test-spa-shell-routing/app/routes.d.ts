// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | `/`
        | `/(authed)`
        | `/(authed)/admin`
        | `/(authed)/admin/`
        | `/(authed)/beta/signup`
        | `/(authed)/dashboard`
        | `/(chat)`
        | `/(chat)/[serverId]/`
        | `/(chat)/[serverId]/[channelId]/`
        | `/(public)`
        | `/(public)/`
        | `/(public)/about`
        | `/(public)/login`
        | `/[serverId]/`
        | `/[serverId]/[channelId]/`
        | `/_sitemap`
        | `/about`
        | `/admin`
        | `/admin/`
        | `/beta/signup`
        | `/dashboard`
        | `/login`
      DynamicRoutes: 
        | `/${OneRouter.SingleRoutePart<T>}`
        | `/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(authed)/dashboard/${OneRouter.SingleRoutePart<T>}`
        | `/(chat)/${OneRouter.SingleRoutePart<T>}`
        | `/(chat)/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/dashboard/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/(authed)/dashboard/[appId]`
        | `/(chat)/[serverId]`
        | `/(chat)/[serverId]/[channelId]`
        | `/[serverId]`
        | `/[serverId]/[channelId]`
        | `/dashboard/[appId]`
      IsTyped: true
      RouteTypes: {
        '/(authed)/dashboard/[appId]': RouteInfo<{ appId: string }>
        '/(chat)/[serverId]': RouteInfo<{ serverId: string }>
        '/(chat)/[serverId]/[channelId]': RouteInfo<{ serverId: string; channelId: string }>
        '/[serverId]': RouteInfo<{ serverId: string }>
        '/[serverId]/[channelId]': RouteInfo<{ serverId: string; channelId: string }>
        '/dashboard/[appId]': RouteInfo<{ appId: string }>
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