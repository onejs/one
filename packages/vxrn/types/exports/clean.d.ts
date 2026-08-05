import type { VXRNOptions } from '../types';
export declare function prepareCacheForVersion({ root, cacheDir, versionHash, forceClean, }: {
    root: string;
    cacheDir: string;
    versionHash: string;
    forceClean?: boolean;
}): Promise<boolean>;
export declare const clean: (rest: VXRNOptions, only?: "vite") => Promise<void>;
//# sourceMappingURL=clean.d.ts.map