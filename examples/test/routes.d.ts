import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/api/react-jsx` | `/not-found/test` | `/ssr/basic`
      DynamicRoutes: `/not-found/+not-found`
      DynamicRouteTemplate: `/not-found/+not-found`
      IsTyped: true
    }
  }
}