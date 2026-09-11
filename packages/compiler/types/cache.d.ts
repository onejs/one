interface CacheStats {
    hits: 0;
    misses: 0;
    writes: 0;
    errors: 0;
}
export declare function getCachedTransform(filePath: string, code: string, environment: string): {
    code: string;
    map?: any;
} | null;
export declare function setCachedTransform(filePath: string, code: string, result: {
    code: string;
    map?: any;
}, environment: string): void;
/** Drop every cached transform, for `react-native bundle --reset-cache`. */
export declare function clearTransformCache(): void;
export declare function getCacheStats(): CacheStats;
export declare function logCacheStats(): void;
export {};
//# sourceMappingURL=cache.d.ts.map