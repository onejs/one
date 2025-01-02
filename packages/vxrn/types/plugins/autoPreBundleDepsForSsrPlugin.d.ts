import type { Plugin } from 'vite';
export declare const getSSRExternalsCachePath: (root: string) => string;
export declare function autoPreBundleDepsForSsrPlugin({ root, exclude, }: {
    root: string;
    exclude?: string[];
}): Plugin;
//# sourceMappingURL=autoPreBundleDepsForSsrPlugin.d.ts.map