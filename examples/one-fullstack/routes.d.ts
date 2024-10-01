import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(docs)` | `/_sitemap` | `/account` | `/admin` | `/login`
      DynamicRoutes:
        | `/(docs)/docs/${OneRouter.SingleRoutePart<T>}`
        | `/docs/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(docs)/docs/[slug]` | `/docs/[slug]`
      IsTyped: true
    }
  }
}
