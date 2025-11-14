// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/page-in-basic-app-case`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}