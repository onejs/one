export declare const dynamicImport: (path: string) => Promise<any>;
export declare function isChunkLoadError(err: unknown): boolean;
export declare function handleSkewError(): boolean;
export declare const CHUNK_RETRY_ATTEMPTS = 3;
export declare const CHUNK_RETRY_DELAY_MS = 500;
export declare function loadWithRetry<T>(loader: () => Promise<T>, options?: {
    attempts?: number;
    delayMs?: number;
    delay?: (ms: number) => Promise<void>;
    onChunkErrorExhausted?: () => boolean;
}): Promise<T>;
//# sourceMappingURL=dynamicImport.d.ts.map