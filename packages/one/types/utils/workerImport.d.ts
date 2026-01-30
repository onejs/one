/**
 * Import a module in a worker-safe way with caching.
 * Automatically appends .mjs extension for proper ESM resolution in workers.
 *
 * @param relativePath - Path relative to the caller's file
 * @param callerUrl - Pass import.meta.url from the calling file
 */
export declare function workerImport<T = any>(relativePath: string, callerUrl: string): Promise<T>;
//# sourceMappingURL=workerImport.d.ts.map