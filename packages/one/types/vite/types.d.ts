import type { GetTransform } from '@vxrn/compiler';
import type { metroPlugin } from '@vxrn/vite-plugin-metro';
import type { PluginOptions as TSConfigPluginOptions } from 'vite-tsconfig-paths';
import type { AutoDepOptimizationOptions, DepOptimize, DepPatch, AfterBuildProps as VXRNAfterBuildProps, VXRNBuildOptions, VXRNOptions } from 'vxrn';
import type { RouteNode } from '../router/Route';
import type { One as OneShared } from '../interfaces/router';
type MetroPluginOptions = Parameters<typeof metroPlugin>[0];
export type RouteInfo<TRegex = string> = {
    file: string;
    page: string;
    namedRegex: TRegex;
    loaderPath?: string;
    loaderServerPath?: string;
    urlPath: string;
    urlCleanPath: string;
    routeKeys: Record<string, string>;
    layouts?: RouteNode[];
    middlewares?: RouteNode[];
    type: One.RouteType;
    isNotFound?: boolean;
};
export declare namespace One {
    export type Options = Omit<VXRNOptions, keyof PluginOptions> & PluginOptions;
    export type RouteRenderMode = 'ssg' | 'spa' | 'ssr';
    export type RouteType = RouteRenderMode | 'api' | 'layout';
    export type ClientData = Record<string, any>;
    export type RouteOptions = {
        routeModes?: Record<string, RouteRenderMode>;
    };
    export type FixDependencies = {
        [key: string]: DepOptimize | DepPatch['patchFiles'];
    };
    type PluginPlatformTarget = 'native' | 'web';
    export type PluginOptions = {
        /**
         * Enabling zero does a couple very simple things:
         *
         *   - It makes zero hand of seamelessly from server to client without flicker
         *
         */
        /**
         * Per-file control over how code transforms.
         * Defaults to SWC, runs babel before SWC if:
         *
         *  - options.react.compiler is `true`, on tsx files in your app
         *  - `react-native-reanimated` is in your dependencies and a file contains a reanimated keyword
         *
         * Otherwise One defaults to using `@swc/core`.
         *
         * Accepts a function:
         *
         *   (props: {
         *      id: string
         *      code: string
         *      development: boolean
         *      environment: Environment
         *      reactForRNVersion: '18' | '19'
         *   }) =>
         *      | true     // default transforms
         *      | false    // no transforms
         *      | 'babel'  // force babel default transform
         *      | 'swc'    // force swc default transform
         *
         *       // force babel, custom transform
         *
         *      | {
         *          transform: 'babel'
         *          excludeDefaultPlugins?: boolean
         *        } & babel.TransformOptions
         *
         *      // force swc, custom transform
         *
         *      | {
         *          transform: 'swc'
         *        } & SWCOptions
         *
         * Babel defaults to preset `@babel/preset-typescript` with plugins:
         *
         *  - @babel/plugin-transform-destructuring
         *  - @babel/plugin-transform-runtime
         *  - @babel/plugin-transform-react-jsx
         *  - @babel/plugin-transform-async-generator-functions
         *  - @babel/plugin-transform-async-to-generator
         *
         *
         * SWC defaults to target es5 for native, es2020 for web.
         *
         */
        transform?: GetTransform;
        router?: {
            /**
             * An array of globs that One uses to ignore files in your routes directory. If a file matches any pattern, it will not be treated as a route.
             *
             * This is useful for ignoring test or utility files you wish to colocate.
             *
             * Currently, we only support patterns starting with <code>&#42;&#42;/&#42;</code>.
             *
             * Example:
             * * <code>&#42;&#42;/&#42;.test.*</code>
             */
            ignoredRouteFiles?: Array<`**/*${string}`>;
            /**
             * Dangerously customize the router root directory. This may lead to unexpected behavior.
             */
            root?: string;
            experimental?: {
                /**
                 * If enabled, the router will try to avoid unnecessary remounts of _layout components.
                 *
                 * We aren't sure that this won't cause any side effects and break things, so this is still experimental and defaults to `false`.
                 *
                 * Currently, this will only effect the `<Slot />` navigator, where it will modify the screen element provided by `react-navigation` and set the `key` to a static value to prevent re-mounting.
                 */
                preventLayoutRemounting?: boolean;
                /**
                 * Auto-generate route type helpers in route files.
                 *
                 * Route types are always generated in routes.d.ts. This option controls whether
                 * One automatically inserts type helpers into your route files.
                 *
                 * Options:
                 * - `false` (default): No auto-generation, manually add types yourself
                 * - `'type'`: Auto-inserts type-only helpers:
                 *   ```typescript
                 *   import type { RouteType } from 'one'
                 *   type Route = RouteType<'/your/[route]'>
                 *   ```
                 * - `'runtime'`: Auto-inserts runtime helpers:
                 *   ```typescript
                 *   import { createRoute } from 'one'
                 *   const route = createRoute<'/your/[route]'>()
                 *   ```
                 *
                 * The insertion happens automatically when route files are created or modified,
                 * and respects your existing code (won't modify loaders, etc).
                 *
                 * @default false
                 */
                typedRoutesGeneration?: false | 'type' | 'runtime';
            };
        };
        react?: {
            /**
             * Enable the React Compiler, for all or specific platforms
             * @default false
             */
            compiler?: boolean | PluginPlatformTarget;
        };
        optimization?: {
            /**
             * Turn on [vite-plugin-barrel](https://github.com/JiangWeixian/vite-plugin-barrel/tree/master).
             * Optimizes barrel export files to speed up your build, you must list the packages that have
             * barrel exports. Especially useful for icon packs.
             *
             * @default ['@tamagui/lucide-icons']
             */
            barrel?: boolean | string[];
            /**
             * By default One scans your fs routes and adds them as Vite `entries`, this prevents some hard
             * reloads on web as you navigate to new pages, but can slow things startup.
             *
             * The 'flat' option is default and will automatically add just the routes at the root of your
             * app but nothing nested in non-group folders below that.
             *
             * @default 'flat'
             */
            autoEntriesScanning?: boolean | 'flat';
        };
        /**
         * Path to a js or ts file to import before the rest of your app runs
         * One controls your root, but you may want to runs some JS before anything else
         * Use this to give One the entrypoint to run
         *
         * Can be a string to use the same file for all environments, or an object to specify
         * different files per environment:
         *
         * @example
         * setupFile: './setup.ts'
         *
         * @example
         * setupFile: {
         *   client: './setup.client.ts',
         *   server: './setup.server.ts',
         *   native: './setup.native.ts'
         * }
         *
         * @example
         * setupFile: {
         *   client: './setup.client.ts',
         *   server: './setup.server.ts',
         *   ios: './setup.ios.ts',
         *   android: './setup.android.ts'
         * }
         */
        setupFile?: string | {
            client?: string;
            server?: string;
            native?: string;
        } | {
            client?: string;
            server?: string;
            ios?: string;
            android?: string;
        };
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
        native?: {
            /**
             * The uid of your native app, this will be used internally in one to call
             * `AppRegistry.registerComponent(key)`
             */
            key?: string;
            /**
             * Turns on react-native-css-interop support when importing CSS on native
             */
            css?: boolean;
            /**
             * Specifies the bundler to use for native builds. Defaults to 'vite'.
             *
             * - 'metro' is recommended for production stability. Note that this option comes with some limitations, see https://onestack.dev/docs/metro-mode#limitations for more info.
             * - 'vite' is experimental but offers faster builds with SWC.
             *
             * Note that the ONE_METRO_MODE environment variable can override this setting to 'metro'.
             */
            bundler?: 'metro' | 'vite';
        } & ({
            bundler: 'metro';
            /** Options merging for Metro is not fully implemented in the One plugin, changing this may not work properly. Search for "METRO-OPTIONS-MERGING" in the codebase for details. */
            bundlerOptions?: MetroPluginOptions;
        } | {
            bundler?: 'vite';
            /** No configurable options with the default vite bundler. */
            bundlerOptions?: {
                currentlyHaveNoOptions?: null;
            };
        });
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
             * Deployment target for production builds.
             * - 'node': Default Node.js server using Hono
             * - 'vercel': Vercel serverless functions
             * - 'cloudflare': Cloudflare Workers
             *
             * @default node
             */
            deploy?: 'node' | 'vercel' | 'cloudflare';
            /**
             * @experimental
             * When true, inlines the CSS content directly into the HTML instead of using <link> tags.
             * This can improve performance by eliminating an extra network request for CSS.
             *
             * @default false
             */
            inlineLayoutCSS?: boolean;
            /**
             * @experimental
             * Controls how scripts are loaded for improved performance.
             *
             * - `'defer-non-critical'`: Critical scripts (framework entry, page, layouts) load immediately.
             *   Non-critical scripts (component imports, utilities) become modulepreload hints only,
             *   reducing network/CPU contention.
             *
             * - `'after-lcp'`: Scripts download immediately via modulepreload but execution is deferred
             *   until after first paint using double requestAnimationFrame. This allows the browser to
             *   paint the SSR content before executing JavaScript. Only applies to SSG pages.
             *
             * - `'after-lcp-aggressive'`: Only modulepreloads critical scripts (entry, layouts).
             *   Non-critical scripts have no modulepreload hints, reducing network saturation.
             *   Best for pages with many chunks or slow networks.
             *
             * @default undefined (all scripts load with async)
             */
            experimental_scriptLoading?: 'defer-non-critical' | 'after-lcp' | 'after-lcp-aggressive';
            /**
             * Generate a sitemap.xml file during build.
             *
             * Set to `true` for default behavior, or pass an object to configure:
             *
             * @example
             * sitemap: true
             *
             * @example
             * sitemap: {
             *   baseUrl: 'https://example.com',  // defaults to ONE_SERVER_URL env var
             *   priority: 0.7,                    // default priority for all routes
             *   changefreq: 'weekly',             // default changefreq for all routes
             *   exclude: ['/admin/*', '/api/*'],  // glob patterns to exclude
             * }
             *
             * Routes can also export sitemap metadata:
             * ```ts
             * export const sitemap = { priority: 0.9, changefreq: 'daily' }
             * // or exclude: export const sitemap = { exclude: true }
             * ```
             */
            sitemap?: boolean | SitemapOptions;
        };
        server?: VXRNOptions['server'];
        build?: {
            server?: VXRNBuildOptions | false;
            api?: VXRNBuildOptions;
        };
        deps?: FixDependencies;
        ssr?: {
            /**
             * One scans dependencies on startup and decides which ones to optimize based on known broken
             * dependencies. These include react-native and react, which need to be optimized to work.
             * It finds all parent dependencies of the know bad deps and adds them to ssr.optimizeDeps.include.
             *
             * You can disable with false, or configure the include/exclude with options.
             *
             * Note: the **full path** (e.g. `<your_project_path>/node_modules/<some_package>`) will be used to match dependencies, if you are using a string to match a package name you may want to add `*` + `/` at the start and `/*` the end.
             *
             * @default { include: /node_modules/ }
             */
            autoDepsOptimization?: boolean | AutoDepOptimizationOptions;
        };
    };
    export interface RouteContext {
        keys(): string[];
        (id: string): any;
        <T>(id: string): T;
        resolve(id: string): string;
        id: string;
    }
    export type Redirect = {
        source: string;
        destination: string;
        permanent: boolean;
    };
    export type BuildInfo = {
        constants: {
            CACHE_KEY: string;
        };
        oneOptions?: PluginOptions;
        routeToBuildInfo: Record<string, Omit<One.RouteBuildInfo, 'loaderData'>>;
        /** A mapping to lookup the full route name from a path */
        pathToRoute: Record<string, string>;
        routeMap: Record<string, string>;
        manifest: {
            pageRoutes: RouteInfo[];
            apiRoutes: RouteInfo[];
            allRoutes: RouteInfo[];
        };
        preloads: Record<string, boolean>;
        cssPreloads: Record<string, boolean>;
        loaders: Record<string, boolean>;
        useRolldown?: boolean;
    };
    export type AfterBuildProps = VXRNAfterBuildProps & BuildInfo;
    export type RouteBuildInfo = {
        type: One.RouteType;
        path: string;
        routeFile: string;
        middlewares: string[];
        preloadPath: string;
        cssPreloadPath: string;
        loaderPath: string;
        cleanPath: string;
        htmlPath: string;
        clientJsPath: string;
        serverJsPath: string;
        params: Object;
        loaderData: any;
        /** All preloads (for backwards compatibility) */
        preloads: string[];
        /** Critical preloads that load immediately with async */
        criticalPreloads?: string[];
        /** Non-critical preloads that are modulepreload hints only */
        deferredPreloads?: string[];
        css: string[];
        /** When inlineLayoutCSS is enabled, contains the actual CSS content */
        cssContents?: string[];
    };
    export type ServerContext = {
        css?: string[];
        /** When inlineLayoutCSS is enabled, this contains the actual CSS content to inline */
        cssContents?: string[];
        /** Number of inline CSS entries - used for hydration matching when cssContents is stripped */
        cssInlineCount?: number;
        postRenderData?: any;
        loaderData?: any;
        loaderProps?: any;
        mode?: 'spa' | 'ssg' | 'ssr';
        routePreloads?: Record<string, string>;
    };
    export type Flags = {
        /** See PluginOptions.router.experimental.PreventLayoutRemounting */
        experimentalPreventLayoutRemounting?: boolean;
    };
    export type SitemapChangefreq = OneShared.SitemapChangefreq;
    export type RouteSitemap = OneShared.RouteSitemap;
    export type SitemapOptions = {
        /**
         * Base URL for the sitemap. Defaults to ONE_SERVER_URL environment variable.
         */
        baseUrl?: string;
        /**
         * Default priority for all routes (0.0 to 1.0).
         * @default 0.5
         */
        priority?: number;
        /**
         * Default change frequency for all routes.
         */
        changefreq?: SitemapChangefreq;
        /**
         * Glob patterns for routes to exclude from the sitemap.
         * API routes and not-found routes are always excluded.
         */
        exclude?: string[];
    };
    export {};
}
export {};
//# sourceMappingURL=types.d.ts.map