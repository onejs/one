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
        | `/(app)/`
        | `/(app)/(panel)`
        | `/(app)/(workspace)`
        | `/(app)/(workspace)/(panel)`
        | `/(app)/analytics`
        | `/(app)/console`
        | `/(app)/deploy`
        | `/(app)/editor`
        | `/(app)/factory`
        | `/(app)/logs`
        | `/(app)/network`
        | `/(app)/preview`
        | `/(app)/prod`
        | `/(app)/project`
        | `/(app)/project/[projectId]/`
        | `/(app)/project/[projectId]/[sessionId]/`
        | `/(app)/project/[projectId]/[sessionId]/deploy`
        | `/(app)/project/[projectId]/[sessionId]/factory`
        | `/(app)/project/[projectId]/[sessionId]/prod`
        | `/(app)/settings`
        | `/(app)/terminal`
        | `/(auth)`
        | `/(auth)/auth/login`
        | `/(auth)/auth/login-success`
        | `/(panel)`
        | `/(site)`
        | `/(site)/compat`
        | `/(site)/docs`
        | `/(site)/docs/`
        | `/(site)/download`
        | `/(workspace)`
        | `/(workspace)/(panel)`
        | `/_sitemap`
        | `/analytics`
        | `/auth/login`
        | `/auth/login-success`
        | `/compat`
        | `/console`
        | `/deploy`
        | `/docs`
        | `/docs/`
        | `/download`
        | `/editor`
        | `/factory`
        | `/logs`
        | `/network`
        | `/preview`
        | `/prod`
        | `/project`
        | `/project/[projectId]/`
        | `/project/[projectId]/[sessionId]/`
        | `/project/[projectId]/[sessionId]/deploy`
        | `/project/[projectId]/[sessionId]/factory`
        | `/project/[projectId]/[sessionId]/prod`
        | `/settings`
        | `/terminal`
      DynamicRoutes: 
        | `/(app)/(panel)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/(workspace)/(panel)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/(workspace)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(panel)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(site)/docs/${string}`
        | `/(workspace)/(panel)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(workspace)/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/docs/${string}`
        | `/nested-project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/(app)/(panel)/nested-project/[projectId]/[sessionId]`
        | `/(app)/(workspace)/(panel)/nested-project/[projectId]/[sessionId]`
        | `/(app)/(workspace)/nested-project/[projectId]/[sessionId]`
        | `/(app)/nested-project/[projectId]/[sessionId]`
        | `/(app)/project/[projectId]`
        | `/(app)/project/[projectId]/[sessionId]`
        | `/(panel)/nested-project/[projectId]/[sessionId]`
        | `/(site)/docs/[...slug]`
        | `/(workspace)/(panel)/nested-project/[projectId]/[sessionId]`
        | `/(workspace)/nested-project/[projectId]/[sessionId]`
        | `/docs/[...slug]`
        | `/nested-project/[projectId]/[sessionId]`
        | `/project/[projectId]`
        | `/project/[projectId]/[sessionId]`
      IsTyped: true
      RouteTypes: {
        '/(app)/(panel)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(app)/(workspace)/(panel)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(app)/(workspace)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(app)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(app)/project/[projectId]': RouteInfo<{ projectId: string }>
        '/(app)/project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(panel)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(site)/docs/[...slug]': RouteInfo<{ slug: string[] }>
        '/(workspace)/(panel)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(workspace)/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/docs/[...slug]': RouteInfo<{ slug: string[] }>
        '/nested-project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/project/[projectId]': RouteInfo<{ projectId: string }>
        '/project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; search?: string; subdomain?: string; params: Params; request?: Request }
}