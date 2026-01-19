// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/blocking/fast` | `/blocking/slow` | `/default-spa` | `/default-ssg` | `/instant/fast` | `/instant/slow` | `/no-loader` | `/timed/200ms` | `/timed/600ms`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}