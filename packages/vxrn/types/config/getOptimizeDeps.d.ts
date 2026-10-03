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
            transform: {
                define: {
                    'process.env.EXPO_OS': string;
                };
            };
            moduleTypes: {
                '.js': "jsx";
                '.ts': "ts";
                '.tsx': "tsx";
            };
            shimMissingExports: true;
        };
    };
};
//# sourceMappingURL=getOptimizeDeps.d.ts.map