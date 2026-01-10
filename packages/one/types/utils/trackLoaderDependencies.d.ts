export type LoaderResult<T> = {
    result: T;
    dependencies: Set<string>;
};
export declare function trackLoaderDependencies<T>(fn: () => T | Promise<T>): Promise<LoaderResult<Awaited<T>>>;
//# sourceMappingURL=trackLoaderDependencies.d.ts.map