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
      DynamicRoutes: 
        | `/case1/${OneRouter.SingleRoutePart<T>}`
        | `/case2/${OneRouter.SingleRoutePart<T>}`
        | `/case2/${OneRouter.SingleRoutePart<T>}/+not-found`
        | `/case3/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/case4/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/case4/${OneRouter.SingleRoutePart<T>}/+not-found`
        | `/case5/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/case5/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}/+not-found`
        | `/case6/${OneRouter.SingleRoutePart<T>}/segment`
        | `/case7/prefix/${OneRouter.SingleRoutePart<T>}`
        | `/case7/prefix/${OneRouter.SingleRoutePart<T>}/+not-found`
        | `/case8/${OneRouter.SingleRoutePart<T>}/+not-found`
        | `/case8/${OneRouter.SingleRoutePart<T>}/mid/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/case1/[param1]`
        | `/case2/[param1]`
        | `/case2/[param1]/+not-found`
        | `/case3/[param1]/[param2]`
        | `/case4/[param1]/+not-found`
        | `/case4/[param1]/[param2]`
        | `/case5/[param1]/[param2]/[param3]`
        | `/case5/[param1]/[param2]/[param3]/+not-found`
        | `/case6/[param1]/segment`
        | `/case7/prefix/[param1]`
        | `/case7/prefix/[param1]/+not-found`
        | `/case8/[param1]/+not-found`
        | `/case8/[param1]/mid/[param2]`
      IsTyped: true
      RouteTypes: {
        '/case1/[param1]': RouteInfo<{ param1: string }>
        '/case2/[param1]': RouteInfo<{ param1: string }>
        '/case2/[param1]/+not-found': RouteInfo<{ param1: string }>
        '/case3/[param1]/[param2]': RouteInfo<{ param1: string; param2: string }>
        '/case4/[param1]/+not-found': RouteInfo<{ param1: string }>
        '/case4/[param1]/[param2]': RouteInfo<{ param1: string; param2: string }>
        '/case5/[param1]/[param2]/[param3]': RouteInfo<{ param1: string; param2: string; param3: string }>
        '/case5/[param1]/[param2]/[param3]/+not-found': RouteInfo<{ param1: string; param2: string; param3: string }>
        '/case6/[param1]/segment': RouteInfo<{ param1: string }>
        '/case7/prefix/[param1]': RouteInfo<{ param1: string }>
        '/case7/prefix/[param1]/+not-found': RouteInfo<{ param1: string }>
        '/case8/[param1]/+not-found': RouteInfo<{ param1: string }>
        '/case8/[param1]/mid/[param2]': RouteInfo<{ param1: string; param2: string }>
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