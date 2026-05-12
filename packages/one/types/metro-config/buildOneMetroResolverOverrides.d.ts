export type BuildOneMetroResolverOverridesOptions = {
    projectRoot: string;
};
export type MetroConfigLike = {
    resolver?: Record<string, any>;
} | undefined;
/**
 * Build the Metro resolver overrides One needs for native bundles.
 *
 * Used by getViteMetroPluginOptions, which feeds these into the same
 * getMetroConfigFromViteConfig pipeline both production native bundles and
 * standalone Metro invocations (expo export, eas update) go through. The
 * overrides handle One-specific concerns: server-only stripping, .css → empty,
 * _middleware → empty, react-native-svg fix.
 *
 * Returns a function that takes Metro's default config and produces an
 * overridden config. Callers compose any additional overrides on top.
 */
export declare function buildOneMetroResolverOverrides({ projectRoot, }: BuildOneMetroResolverOverridesOptions): <T extends MetroConfigLike>(defaultConfig: T) => T;
//# sourceMappingURL=buildOneMetroResolverOverrides.d.ts.map