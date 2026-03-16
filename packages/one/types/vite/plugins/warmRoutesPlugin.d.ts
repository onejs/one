import type { Plugin } from 'vite';
/**
 * Passively tracks deps that Vite discovers during normal dev use.
 * On next startup, pre-includes them in optimizeDeps to avoid reload cascades.
 *
 * Use as a top-level plugin in vite.config.ts:
 *
 *   import { autoWarmPlugin } from 'one/vite-auto-warm'
 *   plugins: [autoWarmPlugin(), ...]
 *
 * Pass a path string to persist permanently instead of in .vite cache:
 *
 *   autoWarmPlugin('./src/dev/warmDeps.json')
 */
export declare function autoWarmPlugin(persistPath?: string): Plugin;
export declare const warmRoutesPlugin: typeof autoWarmPlugin;
//# sourceMappingURL=warmRoutesPlugin.d.ts.map