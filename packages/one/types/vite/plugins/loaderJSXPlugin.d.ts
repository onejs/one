import type { Plugin } from 'vite';
export type LoaderJSXUniversalUse = {
    link: boolean;
    primitives: Set<string>;
    allPrimitives: boolean;
};
export declare function createLoaderJSXUniversalUse(): LoaderJSXUniversalUse;
export declare function collectLoaderJSXUniversalImports(program: any, used: LoaderJSXUniversalUse): LoaderJSXUniversalUse;
export declare function loaderJSXUniversalSelection(used: LoaderJSXUniversalUse): string[];
export declare function createLoaderJSXUniversalModule(selection: readonly string[], hasTamagui: boolean): string;
export declare function transformUseClient(code: string, id: string, root: string): {
    code: string;
    map: import("magic-string").SourceMap;
} | undefined;
type LoaderJSXResolver = (source: string, importer: string) => Promise<{
    id: string;
    external?: boolean | 'absolute';
} | null | undefined>;
export declare function collectLoaderJSXRegistrationImports(program: any, importer: string, resolve: LoaderJSXResolver): Promise<string[]>;
export declare function loaderJSXPlugin(opts?: {
    routerRoot?: string;
    root?: string;
}): Plugin;
export {};
//# sourceMappingURL=loaderJSXPlugin.d.ts.map