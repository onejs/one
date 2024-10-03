import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/not-found/test` | `/ssr/basic` | `/sub-page` | `/sub-page/sub` | `/sub-page/sub2`
      DynamicRoutes: `/not-found/+not-found`
      DynamicRouteTemplate: `/not-found/+not-found`
      IsTyped: true
    }
  }
}