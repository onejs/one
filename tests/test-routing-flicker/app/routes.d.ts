// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from "one";

declare module "one" {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/default-mode` | `/docs` | `/no-loader`;
      DynamicRoutes:
        | `/default-mode/${OneRouter.SingleRoutePart<T>}`
        | `/docs/${OneRouter.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/default-mode/[slug]` | `/docs/[slug]`;
      IsTyped: true;
      RouteTypes: {
        "/default-mode/[slug]": RouteInfo<{ slug: string }>;
        "/docs/[slug]": RouteInfo<{ slug: string }>;
      };
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params;
  LoaderProps: { path: string; params: Params; request?: Request };
};
