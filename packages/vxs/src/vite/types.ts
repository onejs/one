import type { Hono } from 'hono'
import type {
  DepOptimize,
  DepPatch,
  AfterBuildProps as VXRNAfterBuildProps,
  VXRNOptions,
} from 'vxrn'
import type { PluginOptions as TSConfigPluginOptions } from 'vite-tsconfig-paths'

export namespace VXS {
  export type Options = Omit<VXRNOptions, keyof PluginOptions> & PluginOptions

  export type RouteRenderMode = 'ssg' | 'spa' | 'ssr'

  export type RouteType = RouteRenderMode | 'api' | 'layout'

  export type RouteOptions = {
    routeModes?: Record<string, RouteRenderMode>
  }

  export type FixDependencies = {
    [key: string]: DepOptimize | DepPatch['patchFiles']
  }

  export type PluginOptions = {
    /**
     * Enabling zero does a couple very simple things:
     *
     *   - It makes zero hand of seamelessly from server to client without flicker
     *
     */
    zero?: boolean

    /**
     * VXS automatically adds vite-tsconfig-paths, set this to false to disable, or
     * pass in an object to pass options down. If you add your own vite-tsconfig-paths
     * we will avoid adding it again internally.
     *
     * See: https://github.com/aleclarson/vite-tsconfig-paths
     *
     * @default false
     */
    tsConfigPaths?: boolean | TSConfigPluginOptions

    /**
     * Path to a js or ts file to import before the rest of your app runs
     * One controls your root, but you may want to runs some JS before anything else
     * Use this to give One the entrypoint to run
     */
    setupFile?: string

    app?: {
      /**
       * The uid of your native app, this will be used internally in vxs to call
       * `AppRegistry.registerComponent(key)`
       */
      key?: string
    }

    web?: {
      /**
       * Choose the default strategy for pages to be rendered on the web.
       *
       * For sites that are mostly static, choose "ssg":
       *   SSG stands for "server side generated", in this mode when you run `build`
       *   your pages will all be fully rendered on the server once during the build,
       *   outputting a static HTML page with the rendered page and loader data inlined.
       *   This gives better performance for initial render, and better SEO.
       *
       *
       * For apps that are mostly dynamic, choose "spa":
       *   SPA stands for "single page app", in this mode when you run `build` your
       *   pages will only render out an empty shell of HTML and will not attempt to
       *   server render at all. Loaders will be run on the server side and the data will
       *   be available to your app on initial render.
       *
       * @default 'ssg'
       */
      defaultRenderMode?: RouteRenderMode

      redirects?: Redirects
    }

    server?: VXRNOptions['server']

    build?: {
      server?: {
        /**
         * Controls server build output module format
         * @default 'esm'
         */
        outputFormat?: 'cjs' | 'esm'
      }

      api?: {
        /**
         * Controls server build output module format
         * @default 'esm'
         */
        outputFormat?: 'cjs' | 'esm'
      }
    }

    deps?: FixDependencies

    afterBuild?: (props: AfterBuildProps) => void | Promise<void>

    afterServerStart?:
      | ((options: Options, server: Hono) => void | Promise<void>)
      | ((options: Options, server: Hono, buildInfo: BuildInfo) => void | Promise<void>)
  }

  export interface RouteContext {
    keys(): string[]
    (id: string): any
    <T>(id: string): T
    resolve(id: string): string
    id: string
  }

  export type Redirect = {
    source: string
    destination: string
    permanent: boolean
  }

  export type Redirects = Redirect[]

  export type BuildInfo = Pick<AfterBuildProps, 'routeMap' | 'builtRoutes'>

  export type AfterBuildProps = VXRNAfterBuildProps & {
    routeMap: Record<string, string>
    builtRoutes: RouteBuildInfo[]
  }

  export type RouteBuildInfo = {
    type: RouteType
    path: string
    cleanPath: string
    htmlPath: string
    clientJsPath: string
    serverJsPath: string
    params: Object
    loaderData: any
    preloads: string[]
  }
}
