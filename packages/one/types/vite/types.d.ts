import type { PluginOptions as TSConfigPluginOptions } from 'vite-tsconfig-paths';
import type { DepOptimize, DepPatch, AfterBuildProps as VXRNAfterBuildProps, VXRNBuildOptions, VXRNOptions, VXRNServePlatform } from 'vxrn';
export declare namespace One {
    type Options = Omit<VXRNOptions, keyof PluginOptions> & PluginOptions;
    type RouteRenderMode = 'ssg' | 'spa' | 'ssr';
    type RouteType = RouteRenderMode | 'api' | 'layout';
    type RouteOptions = {
        routeModes?: Record<string, RouteRenderMode>;
    };
    type FixDependencies = {
        [key: string]: DepOptimize | DepPatch['patchFiles'];
    };
    type PluginOptions = {
        /**
         * Enabling zero does a couple very simple things:
         *
         *   - It makes zero hand of seamelessly from server to client without flicker
         *
         */
        zero?: boolean;
        /**
         * Path to a js or ts file to import before the rest of your app runs
         * One controls your root, but you may want to runs some JS before anything else
         * Use this to give One the entrypoint to run
         */
        setupFile?: string;
        config?: {
            ensureTSConfig?: false;
            /**
             * One automatically adds vite-tsconfig-paths, set this to false to disable, or
             * pass in an object to pass options down. If you add your own vite-tsconfig-paths
             * we will avoid adding it again internally.
             *
             * See: https://github.com/aleclarson/vite-tsconfig-paths
             *
             * @default false
             */
            tsConfigPaths?: boolean | TSConfigPluginOptions;
        };
        app?: {
            /**
             * The uid of your native app, this will be used internally in one to call
             * `AppRegistry.registerComponent(key)`
             */
            key?: string;
        };
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
            defaultRenderMode?: RouteRenderMode;
            /**
             * An array of redirect objects, works in development and production:
             *
             * @example
             *
             * [
             *   {
             *     source: '/vite',
             *     destination: 'https://vxrn.dev',
             *     permanent: true,
             *   },
             *   {
             *     source: '/docs/components/:slug/:version',
             *     destination: '/ui/:slug/:version',
             *     permanent: true,
             *   },
             * ]
             *
             */
            redirects?: Redirect[];
            /**
             * Can be one of "node" or "vercel", this will determine the Hono adapter and build to run
             * properly in production for each platform.
             *
             * @default node
             */
            deploy?: VXRNServePlatform;
        };
        server?: VXRNOptions['server'];
        build?: {
            server?: VXRNBuildOptions;
            api?: VXRNBuildOptions;
        };
        deps?: FixDependencies;
        afterBuild?: (props: AfterBuildProps) => void | Promise<void>;
    };
    interface RouteContext {
        keys(): string[];
        (id: string): any;
        <T>(id: string): T;
        resolve(id: string): string;
        id: string;
    }
    type Redirect = {
        source: string;
        destination: string;
        permanent: boolean;
    };
    type BuildInfo = Pick<AfterBuildProps, 'routeMap' | 'builtRoutes'>;
    type AfterBuildProps = VXRNAfterBuildProps & {
        routeMap: Record<string, string>;
        builtRoutes: RouteBuildInfo[];
    };
    type RouteBuildInfo = {
        type: RouteType;
        path: string;
        cleanPath: string;
        htmlPath: string;
        clientJsPath: string;
        serverJsPath: string;
        params: Object;
        loaderData: any;
        preloads: string[];
    };
}
//# sourceMappingURL=types.d.ts.map