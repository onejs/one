import type { VXSRouter } from 'vxs'

declare module 'vxs' {
  export namespace VXSRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(docs)` | `/_sitemap` | `/account` | `/admin` | `/login`
      DynamicRoutes: `/(docs)/docs/${VXSRouter.SingleRoutePart<T>}` | `/docs/${VXSRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/(docs)/docs/[slug]` | `/docs/[slug]`
      IsTyped: true
    }
  }
}