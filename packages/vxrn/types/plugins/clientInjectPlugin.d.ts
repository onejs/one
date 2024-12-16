import type { Plugin, UserConfig } from 'vite';
export declare function getServerConfigPlugin(): {
    name: string;
    configResolved(this: void, conf: Readonly<Omit<UserConfig, "plugins" | "css" | "json" | "assetsInclude" | "optimizeDeps" | "worker" | "build" | "dev" | "environments" | "server" | "preview"> & {
        configFile: string | undefined;
        configFileDependencies: string[];
        inlineConfig: import("vite").InlineConfig;
        root: string;
        base: string;
        publicDir: string;
        cacheDir: string;
        command: "build" | "serve";
        mode: string;
        isWorker: boolean;
        isProduction: boolean;
        envDir: string;
        env: Record<string, any>;
        resolve: Required<import("vite").ResolveOptions> & {
            alias: import("vite").Alias[];
        };
        plugins: readonly Plugin[];
        css: import("vite").ResolvedCSSOptions;
        json: Required<import("vite").JsonOptions>;
        esbuild: import("vite").ESBuildOptions | false;
        server: import("vite").ResolvedServerOptions;
        dev: import("vite").ResolvedDevEnvironmentOptions;
        builder: Required<import("vite").BuilderOptions> | undefined;
        build: import("vite").ResolvedBuildOptions;
        preview: import("vite").ResolvedPreviewOptions;
        ssr: import("vite").ResolvedSSROptions;
        assetsInclude: (file: string) => boolean;
        logger: import("vite").Logger;
        createResolver: (options?: Partial<import("vite").InternalResolveOptions>) => import("vite").ResolveFn;
        optimizeDeps: import("vite").DepOptimizationOptions;
        worker: import("vite").ResolvedWorkerOptions;
        appType: import("vite").AppType;
        experimental: import("vite").ExperimentalOptions;
        environments: Record<string, {
            define?: Record<string, any>;
            resolve: Required<import("vite").ResolveOptions>;
            consumer: "client" | "server";
            keepProcessEnv?: boolean;
            optimizeDeps: import("vite").DepOptimizationOptions;
            dev: import("vite").ResolvedDevEnvironmentOptions;
            build: import("vite").ResolvedBuildEnvironmentOptions;
        }>;
    } & import("vite").PluginHookUtils>): void;
};
/**
 * some values used by the client needs to be dynamically injected by the server
 * @server-only
 */
export declare function nativeClientInjectPlugin(): Plugin;
//# sourceMappingURL=clientInjectPlugin.d.ts.map