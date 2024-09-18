export type BundleCommandArgs = {
    assetsDest?: string;
    assetCatalogDest?: string;
    entryFile: string;
    resetCache: boolean;
    resetGlobalCache: boolean;
    transformer?: string;
    minify?: boolean;
    config?: string;
    platform: string;
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
export declare function buildBundle(_argv: Array<string>, ctx: any, args: BundleCommandArgs, bundleImpl: any): Promise<void>;
//# sourceMappingURL=buildBundle.d.ts.map