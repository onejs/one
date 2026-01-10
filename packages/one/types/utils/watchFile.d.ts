/**
 * Register a file dependency for loader HMR.
 * No-op on client, registers file path for watching on server.
 */
export declare function watchFile(path: string): void;
/** @internal */
export declare function _registerWatchFileImpl(impl: (path: string) => void): void;
//# sourceMappingURL=watchFile.d.ts.map