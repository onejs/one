export declare function getOptimizeDeps(mode: 'build' | 'serve'): {
    needsInterop: string[];
    depsToOptimize: string[];
    optimizeDeps: {
        include: string[];
        exclude: string[];
        needsInterop: string[];
        holdUntilCrawlEnd: false;
        rolldownOptions: {
            resolve: {
                extensions: string[];
            };
            moduleTypes: {
                '.js': "jsx";
            };
            shimMissingExports: true;
        };
    };
};
//# sourceMappingURL=getOptimizeDeps.d.ts.map