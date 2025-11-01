// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/notifications` | `/notifications/` | `/profile` | `/profile/`
      DynamicRoutes: `/notifications/post/${OneRouter.SingleRoutePart<T>}` | `/post/${OneRouter.SingleRoutePart<T>}` | `/profile/post/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/notifications/post/[id]` | `/post/[id]` | `/profile/post/[id]`
      IsTyped: true
    }
  }
}