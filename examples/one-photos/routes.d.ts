import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(photos)` | `/(photos)/` | `/_sitemap` | `/camera` | `/hello` | `/upload`
      DynamicRoutes: `/(photos)/photo/${OneRouter.SingleRoutePart<T>}` | `/photo/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(photos)/photo/[id]` | `/photo/[id]`
      IsTyped: true
    }
  }
}