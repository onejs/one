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
        | `/one-native-angular-gradient`
        | `/one-native-app-icon`
        | `/one-native-app-info`
        | `/one-native-app-intents`
        | `/one-native-app-tracking`
        | `/one-native-apple-auth`
        | `/one-native-apple-file`
        | `/one-native-arrangement`
        | `/one-native-arrangement-view`
        | `/one-native-audio`
        | `/one-native-autogen`
        | `/one-native-background-tasks`
        | `/one-native-browser`
        | `/one-native-building-blocks`
        | `/one-native-calendar`
        | `/one-native-camera`
        | `/one-native-clipboard`
        | `/one-native-contacts`
        | `/one-native-containers`
        | `/one-native-control-group`
        | `/one-native-control-size`
        | `/one-native-controls`
        | `/one-native-cover-context`
        | `/one-native-crypto`
        | `/one-native-database`
        | `/one-native-device`
        | `/one-native-device-attestation`
        | `/one-native-dialogs`
        | `/one-native-disclosure-group`
        | `/one-native-document-picker`
        | `/one-native-edit-button`
        | `/one-native-editors`
        | `/one-native-effects`
        | `/one-native-elliptical-gradient`
        | `/one-native-fetch`
        | `/one-native-file-system`
        | `/one-native-fonts`
        | `/one-native-gestures`
        | `/one-native-glass-container`
        | `/one-native-gpu`
        | `/one-native-grids`
        | `/one-native-group-box`
        | `/one-native-groups`
        | `/one-native-haptics`
        | `/one-native-horizontal-bar`
        | `/one-native-horizontal-inset`
        | `/one-native-host`
        | `/one-native-image`
        | `/one-native-image-manipulator`
        | `/one-native-image-picker`
        | `/one-native-keep-awake`
        | `/one-native-launch-screen`
        | `/one-native-leaves`
        | `/one-native-linear-gradient`
        | `/one-native-list-row-modifiers`
        | `/one-native-list-search-refresh`
        | `/one-native-list-section-modifiers`
        | `/one-native-lists`
        | `/one-native-live-photo`
        | `/one-native-local-authentication`
        | `/one-native-location`
        | `/one-native-map`
        | `/one-native-map-services`
        | `/one-native-media`
        | `/one-native-menu-picker`
        | `/one-native-menu-primary-action`
        | `/one-native-mesh-gradient`
        | `/one-native-motion`
        | `/one-native-navigation`
        | `/one-native-network`
        | `/one-native-notifications`
        | `/one-native-paste-button`
        | `/one-native-photo-library`
        | `/one-native-picker-palette`
        | `/one-native-pip`
        | `/one-native-popover`
        | `/one-native-portal`
        | `/one-native-print`
        | `/one-native-protected-store`
        | `/one-native-purchases`
        | `/one-native-quick-actions`
        | `/one-native-radial-gradient`
        | `/one-native-safe-area`
        | `/one-native-safe-area-bar`
        | `/one-native-screen-capture`
        | `/one-native-screen-orientation`
        | `/one-native-scroll-search-refresh`
        | `/one-native-secure-store`
        | `/one-native-share`
        | `/one-native-share-empty`
        | `/one-native-sheet`
        | `/one-native-source`
        | `/one-native-speech`
        | `/one-native-state`
        | `/one-native-storage`
        | `/one-native-store-review`
        | `/one-native-swipe-actions`
        | `/one-native-system`
        | `/one-native-tab-lifecycle`
        | `/one-native-tab-oracle`
        | `/one-native-tab-sidebar`
        | `/one-native-tab-slot`
        | `/one-native-tabview`
        | `/one-native-ui-map`
        | `/one-native-updates`
        | `/one-native-view-slot`
        | `/one-native-view-snapshot`
        | `/one-native-view-that-fits`
        | `/one-native-web-photos`
        | `/one-ui-pager`
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