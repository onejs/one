export type BackgroundModule = {
    id: string;
    source: string;
    calculate: string;
    name: string;
    platform: 'web' | 'native';
};
export type BackgroundTransformOptions = {
    platform: 'web' | 'native';
    resolve: (source: string, importer: string) => string;
    nativeModule?: (module: BackgroundModule) => string;
    workerFactory?: (module: BackgroundModule) => string;
};
export declare function loadBackgroundComputationModule(id: string): BackgroundModule | undefined;
export declare function transformBackgroundComputations(source: string, id: string, options: BackgroundTransformOptions): {
    code: string;
    map: import("magic-string").SourceMap;
    modules: BackgroundModule[];
} | undefined;
export declare function createBackgroundWorkletModule(bundle: string, names: readonly string[], key: string): string;
export declare function assertBackgroundDependency(source: string): void;
export type BackgroundGraphModule = {
    id: number;
    code: string;
    dependencies: readonly (number | null)[];
};
export declare function bundleBackgroundGraph(modules: readonly BackgroundGraphModule[], entry: number, names: readonly string[]): string;
//# sourceMappingURL=backgroundComputation.d.ts.map