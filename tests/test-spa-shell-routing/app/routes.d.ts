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
        | `/(gate)`
        | `/(gate)/gate-auth`
        | `/(gate)/gate-auth/login`
        | `/(gate)/gate-home`
        | `/(gate)/gate-home/feed`
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
        | `/gate-auth`
        | `/gate-auth/login`
        | `/gate-home`
        | `/gate-home/feed`
        | `/login`
      DynamicRoutes: 
        | `/${OneRouter.SingleRoutePart<T>}`
        | `/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(authed)/dashboard/${OneRouter.SingleRoutePart<T>}`
        | `/(authed)/thread/${OneRouter.SingleRoutePart<T>}`
        | `/(chat)/${OneRouter.SingleRoutePart<T>}`
        | `/(chat)/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/dashboard/${OneRouter.SingleRoutePart<T>}`
        | `/thread/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/(authed)/dashboard/[appId]`
        | `/(authed)/thread/[id]`
        | `/(chat)/[serverId]`
        | `/(chat)/[serverId]/[channelId]`
        | `/[serverId]`
        | `/[serverId]/[channelId]`
        | `/dashboard/[appId]`
        | `/thread/[id]`
      IsTyped: true
      RouteTypes: {
        '/(authed)/dashboard/[appId]': RouteInfo<{ appId: string }>
        '/(authed)/thread/[id]': RouteInfo<{ id: string }>
        '/(chat)/[serverId]': RouteInfo<{ serverId: string }>
        '/(chat)/[serverId]/[channelId]': RouteInfo<{ serverId: string; channelId: string }>
        '/[serverId]': RouteInfo<{ serverId: string }>
        '/[serverId]/[channelId]': RouteInfo<{ serverId: string; channelId: string }>
        '/dashboard/[appId]': RouteInfo<{ appId: string }>
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