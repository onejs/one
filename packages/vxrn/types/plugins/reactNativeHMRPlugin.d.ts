import type { VXRNOptionsFilled } from '../utils/getOptionsFilled';
import type { Plugin } from 'vite';
export declare function reactNativeHMRPlugin({ root }: VXRNOptionsFilled): {
    name: string;
    configResolved(this: void, config: Readonly<Omit<import("vite").UserConfig, "dev" | "build" | "worker" | "plugins" | "css" | "assetsInclude" | "optimizeDeps" | "environments"> & {
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
        plugins: readonly Plugin<any>[];
        css: import("vite").ResolvedCSSOptions;
        esbuild: false | import("vite").ESBuildOptions;
        server: import("vite").ResolvedServerOptions;
        dev: import("vite").ResolvedDevEnvironmentOptions;
        builder: Required<import("vite").BuilderOptions>;
        build: import("vite").ResolvedBuildOptions;
        preview: import("vite").ResolvedPreviewOptions;
        ssr: import("vite").ResolvedSSROptions;
        assetsInclude: (file: string) => boolean;
        logger: import("vite").Logger;
        createResolver: (options?: Partial<import("vite").InternalResolveOptions> | undefined) => import("vite").ResolveFn;
        optimizeDeps: import("vite").DepOptimizationOptions;
        worker: import("vite").ResolvedWorkerOptions;
        appType: import("vite").AppType;
        experimental: import("vite").ExperimentalOptions;
        environments: Record<string, {
            resolve: Required<import("vite").ResolveOptions & {
                alias?: import("vite").AliasOptions | undefined;
            }>;
            nodeCompatible: boolean;
            webCompatible: boolean;
            injectInvalidationTimestamp: boolean;
            dev: import("vite").ResolvedDevEnvironmentOptions;
            build: import("vite").ResolvedBuildEnvironmentOptions;
        }>;
    } & import("vite").PluginHookUtils>): Promise<void>;
    handleHotUpdate(this: void, { read, modules, file }: import("vite").HmrContext): Promise<void>;
};
//# sourceMappingURL=reactNativeHMRPlugin.d.ts.map