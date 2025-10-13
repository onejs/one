// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/docs` | `/subdomain/myapp` | `/subdomain/myapp/about` | `/subdomain/testapp` | `/subdomain/testapp/about` | `/test` | `/test-rewrites`
      DynamicRoutes: `/docs/${OneRouter.SingleRoutePart<T>}` | `/subdomain/${OneRouter.SingleRoutePart<T>}` | `/subdomain/${OneRouter.SingleRoutePart<T>}/about`
      DynamicRouteTemplate: `/docs/[slug]` | `/subdomain/[name]` | `/subdomain/[name]/about`
      IsTyped: true
    }
  }
}