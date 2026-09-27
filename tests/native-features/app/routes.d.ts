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
        | `/one-native-android-badges`
        | `/one-native-android-cards`
        | `/one-native-android-chips`
        | `/one-native-android-dividers`
        | `/one-native-android-filter-chip`
        | `/one-native-android-flow-row`
        | `/one-native-android-icon-buttons`
        | `/one-native-android-inputs`
        | `/one-native-android-list-items`
        | `/one-native-android-loading`
        | `/one-native-android-progress`
        | `/one-native-android-segmented`
        | `/one-native-android-selection`
        | `/one-native-android-surface`
        | `/one-native-app-info`
        | `/one-native-apple-auth`
        | `/one-native-app-tracking`
        | `/one-native-apple-file`
        | `/one-native-arrangement`
        | `/one-native-arrangement-view`
        | `/one-native-audio`
        | `/one-native-autogen`
        | `/one-native-building-blocks`
        | `/one-native-browser`
        | `/one-native-calendar`
        | `/one-native-clipboard`
        | `/one-native-contacts`
        | `/one-native-containers`
        | `/one-native-controls`
        | `/one-native-cover-context`
        | `/one-native-crypto`
        | `/one-native-database`
        | `/one-native-device`
        | `/one-native-dialogs`
        | `/one-native-document-picker`
        | `/one-native-edit-button`
        | `/one-native-editors`
        | `/one-native-effects`
        | `/one-native-fetch`
        | `/one-native-file-system`
        | `/one-native-fonts`
        | `/one-native-glass-container`
        | `/one-native-gpu`
        | `/one-native-grids`
        | `/one-native-group-box`
        | `/one-native-view-that-fits`
        | `/one-native-view-slot`
        | `/one-native-horizontal-inset`
        | `/one-native-horizontal-bar`
        | `/one-native-safe-area-bar`
        | `/one-native-swipe-actions`
        | `/one-native-disclosure-group`
        | `/one-native-control-group`
        | `/one-native-groups`
        | `/one-native-haptics`
        | `/one-native-host`
        | `/one-native-image`
        | `/one-native-image-picker`
        | `/one-native-image-manipulator`
        | `/one-native-leaves`
        | `/one-native-list-search-refresh`
        | `/one-native-lists`
        | `/one-native-local-authentication`
        | `/one-native-location`
        | `/one-native-map`
        | `/one-native-media`
        | `/one-native-navigation`
        | `/one-native-network`
        | `/one-native-notifications`
        | `/one-native-paste-button`
        | `/one-native-picker-palette`
        | `/one-native-photo-library`
        | `/one-native-pip`
        | `/one-native-popover`
        | `/one-native-protected-store`
        | `/one-native-safe-area`
        | `/one-native-scroll-search-refresh`
        | `/one-native-secure-store`
        | `/one-native-share`
        | `/one-native-share-empty`
        | `/one-native-sheet`
        | `/one-native-source`
        | `/one-native-speech`
        | `/one-native-state`
        | `/one-native-system`
        | `/one-native-tab-sidebar`
        | `/one-native-tab-slot`
        | `/one-native-web-photos`
        | `/one-native-tab-oracle`
        | `/one-native-tabview`
        | `/one-native-ui-map`
        | `/one-native-updates`
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
