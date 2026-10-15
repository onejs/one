import type { ResolvedConfig } from 'vite';
/**
 * Returns the metro build bundle function for a resolved vite config. Resolving
 * the config runs the metro plugin, which records its options on globalThis.
 */
export declare function getBuildBundleFn(viteConfig: ResolvedConfig): (_argv: string[], ctx: any, argsIn: import("./types").BundleCommandArgs, bundleImpl?: any) => Promise<void>;
//# sourceMappingURL=getBuildBundleFn.d.ts.map