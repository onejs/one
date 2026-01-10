import type { Plugin } from 'esbuild';
export declare function getOptimizeDeps(mode: 'build' | 'serve', root?: string): {
    needsInterop: string[];
    depsToOptimize: string[];
    optimizeDeps: {
        include: string[];
        exclude: string[];
        needsInterop: string[];
        holdUntilCrawlEnd: false;
        esbuildOptions: {
            resolveExtensions: string[];
            plugins: Plugin[];
        };
    };
};
//# sourceMappingURL=getOptimizeDeps.d.ts.map