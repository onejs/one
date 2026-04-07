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
        | `/(app)/home`
        | `/(app)/home/(tabs)`
        | `/(app)/home/(tabs)/feed`
        | `/(app)/home/(tabs)/profile`
        | `/(app)/home/feed`
        | `/(app)/home/profile`
        | `/_sitemap`
        | `/docs`
        | `/home`
        | `/home/(tabs)`
        | `/home/(tabs)/feed`
        | `/home/(tabs)/profile`
        | `/home/feed`
        | `/home/profile`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}