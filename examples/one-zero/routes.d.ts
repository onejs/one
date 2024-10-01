import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/(authenticated)`
        | `/(authenticated)/feed`
        | `/(authenticated)/feed/`
        | `/(authenticated)/notifications`
        | `/(authenticated)/profile`
        | `/(feed)`
        | `/_sitemap`
        | `/feed`
        | `/feed/`
        | `/notifications`
        | `/profile`
      DynamicRoutes:
        | `/(authenticated)/feed/${OneRouter.SingleRoutePart<T>}`
        | `/(feed)/post/${OneRouter.SingleRoutePart<T>}`
        | `/feed/${OneRouter.SingleRoutePart<T>}`
        | `/post/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/(authenticated)/feed/[id]`
        | `/(feed)/post/[id]`
        | `/feed/[id]`
        | `/post/[id]`
      IsTyped: true
    }
  }
}
