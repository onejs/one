import type { VXRNOptionsFilled } from './getOptionsFilled';
export declare function getReactNativeConfig(options: VXRNOptionsFilled, viteRNClientPlugin: any): Promise<{
    plugins: any[];
    appType: "custom";
    root: string;
    clearScreen: false;
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
        extensions: string[];
    };
    mode: string;
    define: {
        'process.env.NODE_ENV': string;
    };
    build: {
        ssr: false;
        minify: false;
        commonjsOptions: {
            transformMixedEsModules: true;
            ignore(id: string): boolean;
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
//# sourceMappingURL=getReactNativeConfig.d.ts.map