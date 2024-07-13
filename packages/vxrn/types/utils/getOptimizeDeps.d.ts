export declare function getOptimizeDeps(mode: 'build' | 'serve'): {
    needsInterop: string[];
    depsToOptimize: string[];
    dedupe: string[];
    optimizeDeps: {
        include: string[];
        exclude: string[];
        needsInterop: string[];
        esbuildOptions: {
            resolveExtensions: string[];
        };
    };
};
//# sourceMappingURL=getOptimizeDeps.d.ts.map