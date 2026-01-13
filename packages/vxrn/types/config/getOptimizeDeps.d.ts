export declare function getOptimizeDeps(mode: 'build' | 'serve'): {
    needsInterop: string[];
    depsToOptimize: string[];
    optimizeDeps: {
        include: string[];
        exclude: string[];
        needsInterop: string[];
        holdUntilCrawlEnd: false;
        esbuildOptions: {
            resolveExtensions: string[];
            loader: {
                '.js': "jsx";
            };
        };
    };
};
//# sourceMappingURL=getOptimizeDeps.d.ts.map