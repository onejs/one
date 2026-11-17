/**
 * Returns true only when the Bun ahead-of-time engine is explicitly enabled for
 * an iOS or Android build. Over-the-air updates always compile for Hermes and explicitly
 * override this with ONE_BUN_ENGINE=0.
 */
export declare function isBunEngine(root?: string, platform?: string | null): boolean;
//# sourceMappingURL=bunEngine.d.ts.map