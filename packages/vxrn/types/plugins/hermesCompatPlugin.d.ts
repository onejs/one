import type { Plugin } from 'vite';
/**
 * SWC transform plugin for Hermes compatibility.
 * Hermes doesn't support class field initializers or private fields/methods.
 * Uses SWC env.include to selectively transform only those features.
 *
 * Inspired by rollipop's approach:
 * https://github.com/leegeunhyeok/rollipop/blob/main/packages/rollipop/src/core/plugins/swc-plugin.ts
 */
export declare function hermesCompatPlugin(): Plugin;
//# sourceMappingURL=hermesCompatPlugin.d.ts.map