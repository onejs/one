import type { Plugin } from 'vite';
/**
 * Plugin to set the config for pre-bundling dependencies that we already know
 * are needed and listed in `getOptimizeDeps`.
 *
 * This currently is only used in non-CLI mode since CLI this is done by `getViteServerConfig` in dev or config building logic in `vxrn/src/exports/build.ts` on build.
 */
export declare function defaultDepOptimizePlugin(): Plugin;
//# sourceMappingURL=defaultDepOptimizePlugin.d.ts.map