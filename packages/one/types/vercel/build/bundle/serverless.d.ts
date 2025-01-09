import React from "react";
export declare function generateLambdaBundle({ Component, funcFolder, pageName, outfile, }: {
    Component: React.ElementType;
    funcFolder: string;
    pageName: string;
    outfile?: string;
}): Promise<import("esbuild").BuildResult<{
    stdin: {
        contents: string;
        resolveDir: string;
    };
    outfile: string;
    bundle?: boolean;
    splitting?: boolean;
    preserveSymlinks?: boolean;
    metafile?: boolean;
    outdir?: string;
    outbase?: string;
    external?: string[];
    packages?: "bundle" | "external";
    alias?: Record<string, string>;
    loader?: {
        [ext: string]: import("esbuild").Loader;
    };
    resolveExtensions?: string[];
    mainFields?: string[];
    conditions?: string[];
    write?: boolean;
    allowOverwrite?: boolean;
    tsconfig?: string;
    outExtension?: {
        [ext: string]: string;
    };
    publicPath?: string;
    entryNames?: string;
    chunkNames?: string;
    assetNames?: string;
    inject?: string[];
    banner?: {
        [type: string]: string;
    };
    footer?: {
        [type: string]: string;
    };
    entryPoints?: string[] | Record<string, string> | {
        in: string;
        out: string;
    }[];
    plugins?: import("esbuild").Plugin[];
    absWorkingDir?: string;
    nodePaths?: string[];
    sourcemap?: boolean | "linked" | "inline" | "external" | "both";
    legalComments?: "none" | "inline" | "eof" | "linked" | "external";
    sourceRoot?: string;
    sourcesContent?: boolean;
    format?: import("esbuild").Format;
    globalName?: string;
    target?: string | string[];
    supported?: Record<string, boolean>;
    platform?: import("esbuild").Platform;
    mangleProps?: RegExp;
    reserveProps?: RegExp;
    mangleQuoted?: boolean;
    mangleCache?: Record<string, string | false>;
    drop?: import("esbuild").Drop[];
    dropLabels?: string[];
    minify?: boolean;
    minifyWhitespace?: boolean;
    minifyIdentifiers?: boolean;
    minifySyntax?: boolean;
    lineLimit?: number;
    charset?: import("esbuild").Charset;
    treeShaking?: boolean;
    ignoreAnnotations?: boolean;
    jsx?: "transform" | "preserve" | "automatic";
    jsxFactory?: string;
    jsxFragment?: string;
    jsxImportSource?: string;
    jsxDev?: boolean;
    jsxSideEffects?: boolean;
    define?: {
        [key: string]: string;
    };
    pure?: string[];
    keepNames?: boolean;
    color?: boolean;
    logLevel?: import("esbuild").LogLevel;
    logLimit?: number;
    logOverride?: Record<string, import("esbuild").LogLevel>;
    tsconfigRaw?: string | import("esbuild").TsconfigRaw;
}> | undefined>;
//# sourceMappingURL=serverless.d.ts.map