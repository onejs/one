import type { VXSRouter } from 'one'

declare module 'one' {
  export namespace VXSRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(authenticated)` | `/(authenticated)/feed` | `/(authenticated)/feed/` | `/(authenticated)/notifications` | `/(authenticated)/profile` | `/(feed)` | `/(feed)/` | `/_sitemap` | `/feed` | `/feed/` | `/notifications` | `/profile`
      DynamicRoutes: `/(authenticated)/feed/${VXSRouter.SingleRoutePart<T>}` | `/(feed)/post/${VXSRouter.SingleRoutePart<T>}` | `/feed/${VXSRouter.SingleRoutePart<T>}` | `/post/${VXSRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(authenticated)/feed/[id]` | `/(feed)/post/[id]` | `/feed/[id]` | `/post/[id]`
      IsTyped: true
    }
  }
}