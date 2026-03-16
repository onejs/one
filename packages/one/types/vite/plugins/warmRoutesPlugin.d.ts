import type { Plugin } from 'vite';
/**
 * Reads cached warm deps from a previous session and injects them into
 * optimizeDeps.include so they're pre-optimized on startup.
 *
 * The actual warming + cache writing happens in fileSystemRouterPlugin
 * where the route manifest is available.
 */
export declare function warmRoutesPlugin(): Plugin;
//# sourceMappingURL=warmRoutesPlugin.d.ts.map