// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth-guard)` | `/(auth-guard)/auth-guard` | `/(blog)` | `/(blog)/blog/my-first-post` | `/(marketing)/about` | `/(sub-page-group)` | `/(sub-page-group)/sub-page` | `/(sub-page-group)/sub-page/sub` | `/(sub-page-group)/sub-page/sub2` | `/_sitemap` | `/about` | `/auth-guard` | `/blog/my-first-post` | `/expo-video` | `/hooks` | `/hooks/contents` | `/hooks/contents/page-1` | `/hooks/contents/page-2` | `/layouts` | `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]/` | `/loader` | `/loader/other` | `/middleware` | `/not-found/deep/test` | `/not-found/fallback/test` | `/not-found/test` | `/server-data` | `/sheet` | `/spa/spapage` | `/ssr/basic` | `/sub-page` | `/sub-page/sub` | `/sub-page/sub2` | `/web-extensions`
      DynamicRoutes: `/layouts/nested-layout/with-slug-layout-folder/${OneRouter.SingleRoutePart<T>}` | `/layouts/nested-layout/with-slug-layout-folder/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}` | `/not-found/+not-found` | `/not-found/deep/+not-found` | `/routes/subpath/${string}` | `/spa/${OneRouter.SingleRoutePart<T>}` | `/ssr/${OneRouter.SingleRoutePart<T>}` | `/ssr/${string}`
      DynamicRouteTemplate: `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]` | `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]/[pageSlug]` | `/not-found/+not-found` | `/not-found/deep/+not-found` | `/routes/subpath/[...subpath]` | `/spa/[spaparams]` | `/ssr/[...rest]` | `/ssr/[param]`
      IsTyped: true
    }
  }
}