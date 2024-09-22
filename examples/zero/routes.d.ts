import type { VXSRouter } from 'vxs'

declare module 'vxs' {
  export namespace VXSRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(authenticated)` | `/(authenticated)/feed` | `/(authenticated)/feed/` | `/(authenticated)/notifications` | `/(authenticated)/profile` | `/_sitemap` | `/feed` | `/feed/` | `/notifications` | `/profile`
      DynamicRoutes: `/(authenticated)/feed/${VXSRouter.SingleRoutePart<T>}` | `/feed/${VXSRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(authenticated)/feed/[id]` | `/feed/[id]`
      IsTyped: true
    }
  }
}