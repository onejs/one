import type { Plugin } from 'vite';
export declare const getSSRExternalsCachePath: (root: string) => string;
export declare function autoDepOptimizePlugin({ root, exclude, }: {
    root: string;
    exclude?: string[];
}): Plugin;
//# sourceMappingURL=autoDepOptimizePlugin.d.ts.map