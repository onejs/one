import type { ViteDevServer } from 'vite';
type Context = {
    server: ViteDevServer;
};
export declare function startUserInterface(context: Context): Promise<void>;
/**
 * Cleanup stdin listeners and restore raw mode.
 * Must be called before process exit to prevent hanging.
 */
export declare function cleanupUserInterface(): void;
export {};
//# sourceMappingURL=index.d.ts.map