import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(blog)` | `/(blog)/blog/my-first-post` | `/(marketing)/about` | `/_sitemap` | `/about` | `/blog/my-first-post` | `/not-found/deep/test` | `/not-found/fallback/test` | `/not-found/test` | `/spa/spapage` | `/ssr/basic` | `/sub-page` | `/sub-page/sub` | `/sub-page/sub2`
      DynamicRoutes: `/not-found/+not-found` | `/not-found/deep/+not-found` | `/spa/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/not-found/+not-found` | `/not-found/deep/+not-found` | `/spa/[spaparams]`
      IsTyped: true
    }
  }
}