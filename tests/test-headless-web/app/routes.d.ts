// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/(kept)`
        | `/(kept)/kept-a`
        | `/(kept)/kept-b`
        | `/(tabs)`
        | `/(tabs)/feed`
        | `/(tabs)/profile`
        | `/_sitemap`
        | `/about`
        | `/compose`
        | `/feed`
        | `/kept-a`
        | `/kept-b`
        | `/profile`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}