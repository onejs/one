import { type DepOptimizationConfig, type UserConfig } from 'vite';
type OptimizeDepsConf = {
    include: string[];
    exclude: string[];
    needsInterop: string[];
    esbuildOptions: {
        resolveExtensions: string[];
    };
};
type DepsOptConf = {
    optimizeDeps?: DepOptimizationConfig;
    noExternal?: string | true | RegExp | (string | RegExp)[] | undefined;
};
export declare function mergeUserConfig(optimizeDeps: OptimizeDepsConf, serverConfig: UserConfig, userViteConfig?: UserConfig | null): UserConfig;
export declare function deepMergeOptimizeDeps(a: DepsOptConf, b: DepsOptConf, extraDepsOpt?: OptimizeDepsConf, avoidMergeExternal?: boolean): void;
export {};
//# sourceMappingURL=mergeUserConfig.d.ts.map