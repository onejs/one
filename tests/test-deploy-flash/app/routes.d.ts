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
        | `/(site)`
        | `/(site)/compat`
        | `/(site)/docs`
        | `/(site)/docs/`
        | `/(site)/download`
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
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}`
        | `/(app)/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
        | `/(site)/docs/${string}`
        | `/docs/${string}`
        | `/project/${OneRouter.SingleRoutePart<T>}`
        | `/project/${OneRouter.SingleRoutePart<T>}/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: 
        | `/(app)/project/[projectId]`
        | `/(app)/project/[projectId]/[sessionId]`
        | `/(site)/docs/[...slug]`
        | `/docs/[...slug]`
        | `/project/[projectId]`
        | `/project/[projectId]/[sessionId]`
      IsTyped: true
      RouteTypes: {
        '/(app)/project/[projectId]': RouteInfo<{ projectId: string }>
        '/(app)/project/[projectId]/[sessionId]': RouteInfo<{ projectId: string; sessionId: string }>
        '/(site)/docs/[...slug]': RouteInfo<{ slug: string[] }>
        '/docs/[...slug]': RouteInfo<{ slug: string[] }>
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