import { type InlineConfig, type Logger, type Plugin, type UserConfig } from 'vite';
import type { VXRNOptionsFilled } from './getOptionsFilled';
export declare function getReactNativeConfig(options: VXRNOptionsFilled, internal: {
    mode?: "dev" | "prod";
    assetsDest?: string;
} | undefined, platform: 'ios' | 'android'): Promise<{
    plugins: any[];
    appType: "custom";
    root: string;
    clearScreen: false;
    customLogger: {
        info(msg: string, options: import("vite").LogOptions | undefined): void;
        warn(msg: string, options?: import("vite").LogOptions): void;
        warnOnce(msg: string, options?: import("vite").LogOptions): void;
        error(msg: string, options?: import("vite").LogErrorOptions): void;
        clearScreen(type: import("vite").LogType): void;
        hasErrorLogged(error: Error | import("rollup").RollupError): boolean;
        hasWarned: boolean;
    };
    optimizeDeps: {
        esbuildOptions: {
            jsx: "automatic";
        };
        include: string[];
        exclude: string[];
        needsInterop: string[];
    };
    resolve: {
        dedupe: string[];
        alias: {
            'react-native-css-interop/jsx-dev-runtime': string;
        };
    };
    mode: string;
    define: {
        'process.env.NODE_ENV': string;
        'process.env.ONE_SERVER_URL': string;
    };
    build: {
        ssr: true;
        minify: false;
        commonjsOptions: {
            transformMixedEsModules: true;
            ignore(id: string): id is "react/jsx-runtime" | "react/jsx-dev-runtime";
        };
        rollupOptions: {
            input: string;
            treeshake: false;
            preserveEntrySignatures: "strict";
            output: {
                preserveModules: true;
                format: "cjs";
            };
            onwarn(message: import("rollup").RollupLog, warn: import("rollup").LoggingFunction): void;
            onLog(level: import("rollup").LogLevel, log: import("rollup").RollupLog, handler: import("rollup").LogOrStringHandler): void;
        };
    };
}>;
export declare function getReactNativeResolvedConfig(): Readonly<Omit<UserConfig, "dev" | "server" | "build" | "optimizeDeps" | "plugins" | "css" | "json" | "assetsInclude" | "preview" | "worker" | "environments"> & {
    configFile: string | undefined;
    configFileDependencies: string[];
    inlineConfig: InlineConfig;
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
    logger: Logger;
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
} & import("vite").PluginHookUtils> | null;
//# sourceMappingURL=getReactNativeConfig.d.ts.map