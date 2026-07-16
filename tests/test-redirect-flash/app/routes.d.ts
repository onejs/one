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
        | `/(app)/nested`
        | `/(app)/nested/[id]/`
        | `/_sitemap`
        | `/editor`
        | `/factory`
        | `/nested`
        | `/nested/[id]/`
      DynamicRoutes:
        | `/(app)/nested/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/nested/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/nested/${OneRouter.SingleRoutePart<T>}`
        | `/nested/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/(app)/nested/[id]`
        | `/(app)/nested/[id]/[sub]`
        | `/(app)/project/[projectId]`
        | `/(app)/project/[projectId]/[sessionId]`
        | `/nested/[id]`
        | `/nested/[id]/[sub]`
        | `/project/[projectId]`
        | `/project/[projectId]/[sessionId]`
      IsTyped: true
      RouteTypes: {
        '/(app)/nested/[id]': RouteInfo<{ id: string }>
        '/(app)/nested/[id]/[sub]': RouteInfo<{ id: string; sub: string }>
        '/(app)/project/[projectId]': RouteInfo<{ projectId: string }>
        '/(app)/project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/nested/[id]': RouteInfo<{ id: string }>
        '/nested/[id]/[sub]': RouteInfo<{ id: string; sub: string }>
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