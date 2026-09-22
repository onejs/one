// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/_sitemap`
        | `/bars-action-bar`
        | `/bars-double-bar`
        | `/bars-double-bar/`
        | `/bars-double-bar/saved`
        | `/bars-probe`
        | `/bars-probe-control`
        | `/bars-probe/main`
        | `/bars-probe/main/`
        | `/bars-probe/plain`
        | `/color-test`
        | `/menu-test`
        | `/one-native`
        | `/one-native-accessibility`
        | `/one-native-android`
        | `/one-native-android-inputs`
        | `/one-native-app-info`
        | `/one-native-apple-file`
        | `/one-native-browser`
        | `/one-native-clipboard`
        | `/one-native-containers`
        | `/one-native-controls`
        | `/one-native-crypto`
        | `/one-native-dialogs`
        | `/one-native-effects`
        | `/one-native-fonts`
        | `/one-native-groups`
        | `/one-native-haptics`
        | `/one-native-host`
        | `/one-native-image-picker`
        | `/one-native-leaves`
        | `/one-native-lists`
        | `/one-native-map`
        | `/one-native-media`
        | `/one-native-network`
        | `/one-native-notifications`
        | `/one-native-popover`
        | `/one-native-safe-area`
        | `/one-native-sheet`
        | `/one-native-state`
        | `/one-native-system`
        | `/one-native-tab-oracle`
        | `/split-view-test`
        | `/toolbar-test`
        | `/zoom-detail`
        | `/zoom-test`
      DynamicRoutes: `/deep-link/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/deep-link/[id]`
      IsTyped: true
      RouteTypes: {
        '/deep-link/[id]': RouteInfo<{ id: string }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; search?: string; subdomain?: string; params: Params; request?: Request }
}