import type { PluginItem } from '@babel/core';
export type BuildOneBabelPluginsOptions = {
    projectRoot: string;
    relativeRouterRoot: string;
    ignoredRouteFiles?: Array<`**/*${string}`>;
    linking?: unknown;
    setupFile?: string | {
        native?: string;
        ios?: string;
        android?: string;
    };
    /**
     * Whether to include `@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin`.
     * Defaults to true. The Vite-driven Metro server injects this separately
     * via `patchMetroServerWithViteConfigAndMetroPluginOptions` using the
     * user's Vite `define` config — so the Vite path passes `false` here.
     * Metro CLI invocations (expo export, eas update) don't go through that
     * server hook, so they need the plugin baked into babel.config.
     *
     * Re-applying is idempotent (already-substituted `import.meta.env.X`
     * literals have no remaining `import.meta` to match).
     */
    includeImportMetaEnv?: boolean;
};
export declare function buildRouterRequireContextRegexString(ignoredRouteFiles?: Array<`**/*${string}`>): string;
/**
 * Build the babel plugin chain that One requires for Metro bundles.
 *
 * Shared between the Vite-driven Metro path (getViteMetroPluginOptions) and
 * the standalone `one/babel-preset` export used by user-land babel.config files.
 */
export declare function buildOneBabelPlugins({ projectRoot, relativeRouterRoot, ignoredRouteFiles, linking, setupFile, includeImportMetaEnv, }: BuildOneBabelPluginsOptions): PluginItem[];
//# sourceMappingURL=buildOneBabelPlugins.d.ts.map