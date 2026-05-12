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
};
export declare function buildRouterRequireContextRegexString(ignoredRouteFiles?: Array<`**/*${string}`>): string;
/**
 * Build the babel plugin chain that One requires for Metro bundles.
 *
 * Shared between the Vite-driven Metro path (getViteMetroPluginOptions) and
 * the standalone `one/babel-preset` export used by user-land babel.config files.
 */
export declare function buildOneBabelPlugins({ projectRoot, relativeRouterRoot, ignoredRouteFiles, linking, setupFile, }: BuildOneBabelPluginsOptions): PluginItem[];
//# sourceMappingURL=buildOneBabelPlugins.d.ts.map