import type { Plugin } from 'vite';
export declare function getCriticalCSSSources(): Set<string>;
/**
 * Given the client manifest, returns the set of output CSS paths
 * that were imported with ?critical.
 */
export declare function getCriticalCSSOutputPaths(clientManifest: Record<string, {
    file: string;
    css?: string[];
}>): Set<string>;
export declare function criticalCSSPlugin(): Plugin;
//# sourceMappingURL=criticalCSSPlugin.d.ts.map