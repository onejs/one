import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth-guard)` | `/(auth-guard)/auth-guard` | `/(blog)` | `/(blog)/blog/my-first-post` | `/(marketing)/about` | `/_sitemap` | `/about` | `/auth-guard` | `/blog/my-first-post` | `/expo-video` | `/hooks` | `/hooks/contents` | `/hooks/contents/page-1` | `/hooks/contents/page-2` | `/loader` | `/loader/other` | `/middleware` | `/not-found/deep/test` | `/not-found/fallback/test` | `/not-found/test` | `/sheet` | `/spa/spapage` | `/ssr/basic` | `/sub-page` | `/sub-page/sub` | `/sub-page/sub2`
      DynamicRoutes: `/not-found/+not-found` | `/not-found/deep/+not-found` | `/routes/subpath/${string}` | `/spa/${OneRouter.SingleRoutePart<T>}` | `/ssr/${OneRouter.SingleRoutePart<T>}` | `/ssr/${string}`
      DynamicRouteTemplate: `/not-found/+not-found` | `/not-found/deep/+not-found` | `/routes/subpath/[...subpath]` | `/spa/[spaparams]` | `/ssr/[...rest]` | `/ssr/[param]`
      IsTyped: true
    }
  }
}