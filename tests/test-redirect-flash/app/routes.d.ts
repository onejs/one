// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | `/`
        | `/(app)`
        | `/(app)/`
        | `/(app)/editor`
        | `/(app)/factory`
        | `/_sitemap`
        | `/editor`
        | `/factory`
      DynamicRoutes: 
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/(app)/project/[projectId]`
        | `/(app)/project/[projectId]/[sessionId]`
        | `/project/[projectId]`
        | `/project/[projectId]/[sessionId]`
      IsTyped: true
      RouteTypes: {
        '/(app)/project/[projectId]': RouteInfo<{ projectId: string }>
        '/(app)/project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/project/[projectId]': RouteInfo<{ projectId: string }>
        '/project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
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