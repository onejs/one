export type BundleCommandArgs = {
    assetsDest?: string;
    assetCatalogDest?: string;
    entryFile: string;
    resetCache: boolean;
    resetGlobalCache: boolean;
    transformer?: string;
    minify?: boolean;
    config?: string;
    platform: 'ios' | 'android';
    dev: boolean;
    bundleOutput: string;
    bundleEncoding?: 'utf8' | 'utf16le' | 'ascii';
    maxWorkers?: number;
    sourcemapOutput?: string;
    sourcemapSourcesRoot?: string;
    sourcemapUseAbsolutePath: boolean;
    verbose: boolean;
    unstableTransformProfile: string;
    indexedRamBundle?: boolean;
    resolverOption?: Array<string>;
};
//# sourceMappingURL=types.d.ts.map