import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth-guard)` | `/(auth-guard)/auth-guard` | `/(blog)` | `/(blog)/blog/my-first-post` | `/(marketing)/about` | `/_sitemap` | `/about` | `/auth-guard` | `/blog/my-first-post` | `/expo-video` | `/middleware` | `/not-found/deep/test` | `/not-found/fallback/test` | `/not-found/test` | `/sheet` | `/spa/spapage` | `/ssr/basic` | `/sub-page` | `/sub-page/sub` | `/sub-page/sub2`
      DynamicRoutes: `/not-found/+not-found` | `/not-found/deep/+not-found` | `/spa/${OneRouter.SingleRoutePart<T>}` | `/ssr/${OneRouter.SingleRoutePart<T>}` | `/ssr/${string}`
      DynamicRouteTemplate: `/not-found/+not-found` | `/not-found/deep/+not-found` | `/spa/[spaparams]` | `/ssr/[...rest]` | `/ssr/[param]`
      IsTyped: true
    }
  }
}