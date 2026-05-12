export type BuildOneMetroResolverOverridesOptions = {
    projectRoot: string;
};
export type MetroConfigLike = {
    resolver?: Record<string, any>;
} | undefined;
/**
 * Build the Metro resolver overrides One needs for native bundles.
 *
 * Shared between the Vite-driven Metro path (getViteMetroPluginOptions) and
 * the standalone `one/metro-config` `withOne()` export used by user-land
 * metro.config files.
 *
 * Returns a function that takes Metro's default config and produces an
 * overridden config. Callers compose any additional overrides on top.
 */
export declare function buildOneMetroResolverOverrides({ projectRoot, }: BuildOneMetroResolverOverridesOptions): <T extends MetroConfigLike>(defaultConfig: T) => T;
//# sourceMappingURL=buildOneMetroResolverOverrides.d.ts.map