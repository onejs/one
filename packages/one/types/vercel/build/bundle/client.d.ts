export declare function generateClientBundle({ filePath, outdir, pageName, }: {
    filePath: string;
    outdir?: string;
    pageName: string;
}): Promise<import("esbuild").BuildResult<{
    stdin: {
        contents: string;
        resolveDir: string;
    };
    target: string;
    outfile: string;
    bundle?: boolean | undefined;
    splitting?: boolean | undefined;
    preserveSymlinks?: boolean | undefined;
    metafile?: boolean | undefined;
    outdir?: string | undefined;
    outbase?: string | undefined;
    external?: string[] | undefined;
    packages?: "bundle" | "external" | undefined;
    alias?: Record<string, string> | undefined;
    loader?: {
        [ext: string]: import("esbuild").Loader;
    } | undefined;
    resolveExtensions?: string[] | undefined;
    mainFields?: string[] | undefined;
    conditions?: string[] | undefined;
    write?: boolean | undefined;
    allowOverwrite?: boolean | undefined;
    tsconfig?: string | undefined;
    outExtension?: {
        [ext: string]: string;
    } | undefined;
    publicPath?: string | undefined;
    entryNames?: string | undefined;
    chunkNames?: string | undefined;
    assetNames?: string | undefined;
    inject?: string[] | undefined;
    banner?: {
        [type: string]: string;
    } | undefined;
    footer?: {
        [type: string]: string;
    } | undefined;
    entryPoints?: (string[] | Record<string, string> | {
        in: string;
        out: string;
    }[]) | undefined;
    plugins?: import("esbuild").Plugin[] | undefined;
    absWorkingDir?: string | undefined;
    nodePaths?: string[] | undefined;
    sourcemap?: boolean | "linked" | "inline" | "external" | "both" | undefined;
    legalComments?: "none" | "inline" | "eof" | "linked" | "external" | undefined;
    sourceRoot?: string | undefined;
    sourcesContent?: boolean | undefined;
    format?: import("esbuild").Format | undefined;
    globalName?: string | undefined;
    supported?: Record<string, boolean> | undefined;
    platform?: import("esbuild").Platform | undefined;
    mangleProps?: RegExp | undefined;
    reserveProps?: RegExp | undefined;
    mangleQuoted?: boolean | undefined;
    mangleCache?: Record<string, string | false> | undefined;
    drop?: import("esbuild").Drop[] | undefined;
    dropLabels?: string[] | undefined;
    minify?: boolean | undefined;
    minifyWhitespace?: boolean | undefined;
    minifyIdentifiers?: boolean | undefined;
    minifySyntax?: boolean | undefined;
    lineLimit?: number | undefined;
    charset?: import("esbuild").Charset | undefined;
    treeShaking?: boolean | undefined;
    ignoreAnnotations?: boolean | undefined;
    jsx?: "transform" | "preserve" | "automatic" | undefined;
    jsxFactory?: string | undefined;
    jsxFragment?: string | undefined;
    jsxImportSource?: string | undefined;
    jsxDev?: boolean | undefined;
    jsxSideEffects?: boolean | undefined;
    define?: {
        [key: string]: string;
    } | undefined;
    pure?: string[] | undefined;
    keepNames?: boolean | undefined;
    color?: boolean | undefined;
    logLevel?: import("esbuild").LogLevel | undefined;
    logLimit?: number | undefined;
    logOverride?: Record<string, import("esbuild").LogLevel> | undefined;
    tsconfigRaw?: (string | import("esbuild").TsconfigRaw) | undefined;
}> | undefined>;
//# sourceMappingURL=client.d.ts.map