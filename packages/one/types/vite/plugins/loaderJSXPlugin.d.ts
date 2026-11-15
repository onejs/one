import type { Plugin } from 'vite';
export declare function transformUseClient(code: string, id: string, root: string): {
    code: string;
    map: import("magic-string").SourceMap;
} | undefined;
export declare function loaderJSXPlugin(opts?: {
    routerRoot?: string;
    root?: string;
}): Plugin;
//# sourceMappingURL=loaderJSXPlugin.d.ts.map