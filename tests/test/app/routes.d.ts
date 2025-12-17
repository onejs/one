// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth-guard)` | `/(auth-guard)/auth-guard` | `/(blog)` | `/(blog)/blog/my-first-post` | `/(marketing)/about` | `/(sub-page-group)` | `/(sub-page-group)/sub-page` | `/(sub-page-group)/sub-page/sub` | `/(sub-page-group)/sub-page/sub2` | `/_sitemap` | `/about` | `/auth-guard` | `/blog/my-first-post` | `/expo-video` | `/hooks` | `/hooks/cases/navigating-into-nested-navigator` | `/hooks/cases/navigating-into-nested-navigator/nested-1` | `/hooks/cases/navigating-into-nested-navigator/nested-1/nested-2` | `/hooks/cases/navigating-into-nested-navigator/nested-1/nested-2/page` | `/hooks/contents` | `/hooks/contents/page-1` | `/hooks/contents/page-2` | `/layouts` | `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]/` | `/middleware` | `/not-found/deep/test` | `/not-found/fallback/test` | `/not-found/test` | `/refetch-test` | `/rn-features/platform-specific-extensions/test` | `/rn-features/platform-specific-extensions/test-route-1` | `/rn-features/platform-specific-extensions/test-route-2` | `/router/ignoredRouteFiles/route.normal` | `/server-data` | `/setup-file-test` | `/shared-cache` | `/sheet` | `/simple-refetch` | `/simple-spa-refetch` | `/spa/spapage` | `/ssr` | `/ssr/` | `/ssr/basic` | `/ssr/request-test` | `/sub-page` | `/sub-page/sub` | `/sub-page/sub2` | `/tabs` | `/tabs/` | `/tabs/other` | `/test-refetch` | `/test-refetch-ssr` | `/vite-features/import-meta-env` | `/web-extensions`
      DynamicRoutes: `/dynamic-folder-routes/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}` | `/hooks/contents/with-nested-slug/${OneRouter.SingleRoutePart<T>}` | `/hooks/contents/with-nested-slug/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}` | `/hooks/contents/with-slug/${OneRouter.SingleRoutePart<T>}` | `/layouts/nested-layout/with-slug-layout-folder/${OneRouter.SingleRoutePart<T>}` | `/not-found/+not-found` | `/not-found/deep/+not-found` | `/router/ignoredRouteFiles/+not-found` | `/routes/subpath/${string}` | `/segments-stable-ids/${string}` | `/spa/${OneRouter.SingleRoutePart<T>}` | `/ssr/${OneRouter.SingleRoutePart<T>}` | `/ssr/${OneRouter.SingleRoutePart<T>}/request-test` | `/ssr/${string}`
      DynamicRouteTemplate: `/dynamic-folder-routes/[serverId]/[channelId]` | `/hooks/contents/with-nested-slug/[folderSlug]` | `/hooks/contents/with-nested-slug/[folderSlug]/[fileSlug]` | `/hooks/contents/with-slug/[slug]` | `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]` | `/not-found/+not-found` | `/not-found/deep/+not-found` | `/router/ignoredRouteFiles/+not-found` | `/routes/subpath/[...subpath]` | `/segments-stable-ids/[...segments]` | `/spa/[spaparams]` | `/ssr/[...rest]` | `/ssr/[id]/request-test` | `/ssr/[param]`
      IsTyped: true
      RouteTypes: {
        '/dynamic-folder-routes/[serverId]/[channelId]': RouteInfo<{ serverId: string; channelId: string }>
        '/hooks/contents/with-nested-slug/[folderSlug]': RouteInfo<{ folderSlug: string }>
        '/hooks/contents/with-nested-slug/[folderSlug]/[fileSlug]': RouteInfo<{ folderSlug: string; fileSlug: string }>
        '/hooks/contents/with-slug/[slug]': RouteInfo<{ slug: string }>
        '/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]': RouteInfo<{ layoutSlug: string }>
        '/not-found/+not-found': RouteInfo<{}>
        '/not-found/deep/+not-found': RouteInfo<{}>
        '/router/ignoredRouteFiles/+not-found': RouteInfo<{}>
        '/routes/subpath/[...subpath]': RouteInfo<{ subpath: string[] }>
        '/segments-stable-ids/[...segments]': RouteInfo<{ segments: string[] }>
        '/spa/[spaparams]': RouteInfo<{ spaparams: string }>
        '/ssr/[...rest]': RouteInfo<{ rest: string[] }>
        '/ssr/[id]/request-test': RouteInfo<{ id: string }>
        '/ssr/[param]': RouteInfo<{ param: string }>
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