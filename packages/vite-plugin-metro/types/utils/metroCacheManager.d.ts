import type { ViteDevServer } from 'vite';
/**
 * Check if Metro cache needs to be cleared based on Vite's dep optimization metadata.
 * This hooks into Vite's existing hash computation so we don't duplicate logic.
 * Call this after Vite's depsOptimizer is initialized.
 */
export declare function checkAndClearMetroCacheFromVite(server: ViteDevServer, logger: {
    info: (msg: string, opts?: {
        timestamp?: boolean;
    }) => void;
}): boolean;
//# sourceMappingURL=metroCacheManager.d.ts.map