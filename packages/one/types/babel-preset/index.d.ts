import type { PluginItem, TransformOptions } from '@babel/core';
type BabelConfigAPI = {
    cache?: ((forever?: boolean) => void) & {
        forever?: () => void;
        never?: () => void;
        using?: (cb: () => unknown) => void;
        invalidate?: (cb: () => unknown) => void;
    };
    cwd?: () => string;
    env?: (...args: unknown[]) => string | undefined;
    caller?: <T>(cb: (caller: unknown) => T) => T;
};
export type OneBabelPresetOptions = {
    /** Absolute path to the project root. Defaults to the babel `cwd`. */
    projectRoot?: string;
    /** Router root folder relative to the project root. Defaults to `'app'`. */
    routerRoot?: string;
    /** Route file patterns to exclude (same shape as `one({ router: { ignoredRouteFiles } })`). */
    ignoredRouteFiles?: Array<`**/*${string}`>;
    /** Routing linking config, mirrors `one({ router: { linking } })`. */
    linking?: unknown;
    /** Path to a native setup file, relative to the project root. */
    setupFile?: string | {
        native?: string;
        ios?: string;
        android?: string;
    };
    /** Whether to include `babel-preset-expo` as the base preset. Defaults to true. */
    includeExpoPreset?: boolean;
    /**
     * Whether to include `@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin`.
     * Defaults to true. The Vite-driven Metro server injects this separately via
     * `patchMetroServerWithViteConfigAndMetroPluginOptions` using the user's Vite
     * `define` config — so the Vite path passes `false`. Re-applying is idempotent.
     */
    includeImportMetaEnv?: boolean;
};
/**
 * Standalone babel preset that drops the same plugin chain that the
 * Vite-driven Metro path applies into any `babel.config.{cjs,js,mjs}` file.
 *
 * @example
 * ```js
 * // babel.config.cjs
 * module.exports = require('one/babel-preset')
 * ```
 */
export default function oneBabelPreset(api: BabelConfigAPI, options?: OneBabelPresetOptions): TransformOptions;
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
    includeImportMetaEnv?: boolean;
};
/**
 * The plugin chain shared between the Vite-driven Metro path
 * (`getViteMetroPluginOptions`) and the standalone preset above.
 */
export declare function buildOneBabelPlugins({ projectRoot, relativeRouterRoot, ignoredRouteFiles, linking, setupFile, includeImportMetaEnv, }: BuildOneBabelPluginsOptions): PluginItem[];
export declare function buildRouterRequireContextRegexString(ignoredRouteFiles?: Array<`**/*${string}`>): string;
export {};
//# sourceMappingURL=index.d.ts.map