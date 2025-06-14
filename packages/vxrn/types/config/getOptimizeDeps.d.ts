export declare function getOptimizeDeps(mode: 'build' | 'serve'): {
    needsInterop: string[];
    depsToOptimize: string[];
    optimizeDeps: {
        include: string[];
        exclude: string[];
        needsInterop: string[];
        esbuildOptions: {
            target: string;
            resolveExtensions: string[];
        };
    };
};
//# sourceMappingURL=getOptimizeDeps.d.ts.map