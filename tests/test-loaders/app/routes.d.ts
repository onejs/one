// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from "one";

declare module "one" {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/_sitemap`
        | `/loader`
        | `/loader-redirect`
        | `/loader-refetch`
        | `/loader-refetch/spa`
        | `/loader-refetch/ssr`
        | `/loader-state/page1`
        | `/loader-state/page2`
        | `/loader/other`
        | `/refactor-test`
        | `/refetch-test`
        | `/shared-cache`
        | `/simple-refetch`
        | `/simple-spa-refetch`
        | `/test-refetch`
        | `/test-refetch-ssr`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
      IsTyped: true;
    }
  }
}
