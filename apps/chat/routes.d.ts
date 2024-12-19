import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_devtools/app` | `/_devtools/data` | `/_sitemap` | `/login-github`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
    }
  }
}