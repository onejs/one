import { type UserConfig } from 'vite';
type OptimizeDepsConf = {
    include: string[];
    exclude: string[];
    needsInterop: string[];
    esbuildOptions: {
        resolveExtensions: string[];
    };
};
export declare function mergeUserConfig(optimizeDeps: OptimizeDepsConf, serverConfig: UserConfig, userViteConfig?: UserConfig | null): UserConfig;
export {};
//# sourceMappingURL=mergeUserConfig.d.ts.map