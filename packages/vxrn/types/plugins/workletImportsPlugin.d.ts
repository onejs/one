import { type Plugin } from 'rolldown';
/**
 * bundles selected, synchronous pure-function exports for normal worklets mode.
 * install in native.bundlerOptions.plugins. the replacement module exposes only
 * the configured exports; each entry owns its complete dependency graph.
 */
export declare function workletImportsPlugin(imports: Record<string, readonly string[]>): Plugin;
//# sourceMappingURL=workletImportsPlugin.d.ts.map