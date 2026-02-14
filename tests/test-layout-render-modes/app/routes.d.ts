// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | `/`
        | `/_sitemap`
        | `/deeply-nested`
        | `/deeply-nested/`
        | `/deeply-nested/ssr-section`
        | `/deeply-nested/ssr-section/`
        | `/deeply-nested/ssr-section/spa-leaf`
        | `/deeply-nested/ssr-section/spa-leaf/`
        | `/deeply-nested/ssr-section/ssg-leaf`
        | `/deeply-nested/ssr-section/ssg-leaf/`
        | `/loaders`
        | `/loaders/`
        | `/loaders/nested`
        | `/loaders/nested/`
        | `/loaders/nested/other`
        | `/loaders/no-loader`
        | `/loaders/protected`
        | `/loaders/protected/`
        | `/loaders/protected/dashboard`
        | `/pure-spa`
        | `/pure-spa/`
        | `/pure-spa/other`
        | `/pure-ssg`
        | `/pure-ssg/`
        | `/pure-ssg/other`
        | `/pure-ssr`
        | `/pure-ssr/`
        | `/pure-ssr/other`
        | `/spa-shell-ssg`
        | `/spa-shell-ssg/`
        | `/spa-shell-ssg/other`
        | `/ssg-shell-spa`
        | `/ssg-shell-spa/`
        | `/ssg-shell-spa/other`
        | `/ssg-shell-ssr`
        | `/ssg-shell-ssr/`
        | `/ssg-shell-ssr/other`
        | `/ssr-shell-spa`
        | `/ssr-shell-spa/`
        | `/ssr-shell-spa/other`
        | `/ssr-shell-ssg`
        | `/ssr-shell-ssg/`
        | `/ssr-shell-ssg/other`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}