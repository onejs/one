// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | `/`
        | `/(app)`
        | `/(app)/dashboard`
        | `/(app)/dashboard/(tabs)/settings`
        | `/(app)/dashboard/settings`
        | `/(app)/home`
        | `/(auth-guard)`
        | `/(auth-guard)/auth-guard`
        | `/(blog)`
        | `/(blog)/blog/my-first-post`
        | `/(docs-nav-test)`
        | `/(docs-nav-test)/docs`
        | `/(docs-nav-test)/docs-home`
        | `/(docs-nav-test)/docs/page-1`
        | `/(docs-nav-test)/docs/page-2`
        | `/(docs-nav-test)/docs/page-3`
        | `/(flicker-test)`
        | `/(flicker-test)/flicker-home`
        | `/(hydration-delay)`
        | `/(hydration-delay)/delay-test`
        | `/(hydration-delay)/hydration-`
        | `/(legal)/privacy-policy`
        | `/(legal)/terms-of-service`
        | `/(marketing)/about`
        | `/(site)`
        | `/(site)/(legal)/privacy-policy`
        | `/(site)/(legal)/terms-of-service`
        | `/(site)/privacy-policy`
        | `/(site)/ssg-flicker-test`
        | `/(site)/terms-of-service`
        | `/(sub-page-group)`
        | `/(sub-page-group)/sub-page`
        | `/(sub-page-group)/sub-page/sub`
        | `/(sub-page-group)/sub-page/sub2`
        | `/_old-`
        | `/_sitemap`
        | `/about`
        | `/api-test/users`
        | `/auth-guard`
        | `/blog/my-first-post`
        | `/dashboard`
        | `/dashboard/(tabs)/settings`
        | `/dashboard/settings`
        | `/delay-test`
        | `/docs`
        | `/docs-home`
        | `/docs/page-1`
        | `/docs/page-2`
        | `/docs/page-3`
        | `/expo-video`
        | `/flicker-home`
        | `/folder-modes`
        | `/folder-modes/analytics`
        | `/folder-modes/nested/report`
        | `/folder-modes/override`
        | `/home`
        | `/hooks`
        | `/hooks/cases/navigating-into-nested-navigator`
        | `/hooks/cases/navigating-into-nested-navigator/nested-1`
        | `/hooks/cases/navigating-into-nested-navigator/nested-1/nested-2`
        | `/hooks/cases/navigating-into-nested-navigator/nested-1/nested-2/page`
        | `/hooks/contents`
        | `/hooks/contents/page-1`
        | `/hooks/contents/page-2`
        | `/hydration-`
        | `/intercept-test`
        | `/intercept-test/`
        | `/layouts`
        | `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]/`
        | `/loader-redirect-test`
        | `/loader-redirect-test/`
        | `/loader-redirect-test/dashboard`
        | `/loader-redirect-test/profile`
        | `/loader-redirect-test/settings`
        | `/matches-test`
        | `/matches-test/`
        | `/middleware`
        | `/not-found/deep/test`
        | `/not-found/fallback/test`
        | `/not-found/test`
        | `/privacy-policy`
        | `/protected-test`
        | `/protected-test/`
        | `/protected-test/dashboard`
        | `/protected-test/settings`
        | `/refetch-test`
        | `/rn-features/native-tree-shaking/mdx-loader-test`
        | `/rn-features/platform-specific-extensions/test`
        | `/rn-features/platform-specific-extensions/test-route-1`
        | `/rn-features/platform-specific-extensions/test-route-2`
        | `/router/ignoredRouteFiles/route.normal`
        | `/server-data`
        | `/setup-file-test`
        | `/shared-cache`
        | `/sheet`
        | `/simple-refetch`
        | `/simple-spa-refetch`
        | `/spa/spapage`
        | `/ssg-flicker-test`
        | `/ssr`
        | `/ssr/`
        | `/ssr/basic`
        | `/ssr/cache-headers`
        | `/ssr/request-test`
        | `/ssr/tamagui-hydration`
        | `/sticky-test`
        | `/sub-page`
        | `/sub-page/sub`
        | `/sub-page/sub2`
        | `/tabs`
        | `/tabs/`
        | `/tabs/other`
        | `/terms-of-service`
        | `/test-refetch`
        | `/test-refetch-ssr`
        | `/vite-features/import-meta-env`
        | `/web-extensions`
      DynamicRoutes: 
        | `/(app)/dashboard/(tabs)/feed/post/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/dashboard/feed/post/${OneRouter.SingleRoutePart<T>}`
        | `/dashboard/(tabs)/feed/post/${OneRouter.SingleRoutePart<T>}`
        | `/dashboard/feed/post/${OneRouter.SingleRoutePart<T>}`
        | `/dynamic-folder-routes/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/hooks/contents/with-nested-slug/${OneRouter.SingleRoutePart<T>}`
        | `/hooks/contents/with-nested-slug/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/hooks/contents/with-slug/${OneRouter.SingleRoutePart<T>}`
        | `/intercept-test/items/${OneRouter.SingleRoutePart<T>}`
        | `/layouts/nested-layout/with-slug-layout-folder/${OneRouter.SingleRoutePart<T>}`
        | `/not-found/+not-found`
        | `/not-found/deep/+not-found`
        | `/router/ignoredRouteFiles/+not-found`
        | `/routes/subpath/${string}`
        | `/segments-stable-ids/${string}`
        | `/servers/${OneRouter.SingleRoutePart<T>}`
        | `/spa/${OneRouter.SingleRoutePart<T>}`
        | `/ssg-not-found/${OneRouter.SingleRoutePart<T>}`
        | `/ssg-not-found/+not-found`
        | `/ssr/${OneRouter.SingleRoutePart<T>}`
        | `/ssr/${OneRouter.SingleRoutePart<T>}/request-test`
        | `/ssr/${string}`
      DynamicRouteTemplate: 
        | `/(app)/dashboard/(tabs)/feed/post/[postId]`
        | `/(app)/dashboard/feed/post/[postId]`
        | `/dashboard/(tabs)/feed/post/[postId]`
        | `/dashboard/feed/post/[postId]`
        | `/dynamic-folder-routes/[serverId]/[channelId]`
        | `/hooks/contents/with-nested-slug/[folderSlug]`
        | `/hooks/contents/with-nested-slug/[folderSlug]/[fileSlug]`
        | `/hooks/contents/with-slug/[slug]`
        | `/intercept-test/items/[id]`
        | `/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]`
        | `/not-found/+not-found`
        | `/not-found/deep/+not-found`
        | `/router/ignoredRouteFiles/+not-found`
        | `/routes/subpath/[...subpath]`
        | `/segments-stable-ids/[...segments]`
        | `/servers/[serverId]`
        | `/spa/[spaparams]`
        | `/ssg-not-found/+not-found`
        | `/ssg-not-found/[slug]`
        | `/ssr/[...rest]`
        | `/ssr/[id]/request-test`
        | `/ssr/[param]`
      IsTyped: true
      RouteTypes: {
        '/(app)/dashboard/(tabs)/feed/post/[postId]': RouteInfo<{ postId: string }>
        '/(app)/dashboard/feed/post/[postId]': RouteInfo<{ postId: string }>
        '/dashboard/(tabs)/feed/post/[postId]': RouteInfo<{ postId: string }>
        '/dashboard/feed/post/[postId]': RouteInfo<{ postId: string }>
        '/dynamic-folder-routes/[serverId]/[channelId]': RouteInfo<{ serverId: string; channelId: string }>
        '/hooks/contents/with-nested-slug/[folderSlug]': RouteInfo<{ folderSlug: string }>
        '/hooks/contents/with-nested-slug/[folderSlug]/[fileSlug]': RouteInfo<{ folderSlug: string; fileSlug: string }>
        '/hooks/contents/with-slug/[slug]': RouteInfo<{ slug: string }>
        '/intercept-test/items/[id]': RouteInfo<{ id: string }>
        '/layouts/nested-layout/with-slug-layout-folder/[layoutSlug]': RouteInfo<{ layoutSlug: string }>
        '/not-found/+not-found': RouteInfo<{}>
        '/not-found/deep/+not-found': RouteInfo<{}>
        '/router/ignoredRouteFiles/+not-found': RouteInfo<{}>
        '/routes/subpath/[...subpath]': RouteInfo<{ subpath: string[] }>
        '/segments-stable-ids/[...segments]': RouteInfo<{ segments: string[] }>
        '/servers/[serverId]': RouteInfo<{ serverId: string }>
        '/spa/[spaparams]': RouteInfo<{ spaparams: string }>
        '/ssg-not-found/+not-found': RouteInfo<{}>
        '/ssg-not-found/[slug]': RouteInfo<{ slug: string }>
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