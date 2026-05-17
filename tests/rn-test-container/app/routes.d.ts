// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/(drawer)`
        | `/(drawer)/home`
        | `/(drawer)/settings`
        | `/_sitemap`
        | `/drawer-demo`
        | `/drawer-demo/`
        | `/drawer-demo/settings`
        | `/home`
        | `/redirect-test`
        | `/redirect-test/`
        | `/redirect-test/always-redirect`
        | `/redirect-test/login`
        | `/redirect-test/protected`
        | `/search-params-test`
        | `/settings`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}