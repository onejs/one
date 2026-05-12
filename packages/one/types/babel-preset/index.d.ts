import type { TransformOptions } from '@babel/core';
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
};
/**
 * Standalone babel preset that drops the same plugin chain that the
 * Vite-driven Metro path applies into any `babel.config.{cjs,js,mjs}` file.
 *
 * Use this from a project's `babel.config.cjs` to make `expo export`,
 * `eas update`, and other Metro-direct workflows produce byte-equivalent
 * bundles to what `vxrn`/`one dev`/`one build` produce internally.
 *
 * @example
 * ```js
 * // babel.config.cjs
 * module.exports = require('one/babel-preset')
 * ```
 *
 * @example
 * ```js
 * // babel.config.cjs (with options)
 * module.exports = (api) =>
 *   require('one/babel-preset')(api, { routerRoot: 'src/routes' })
 * ```
 */
export default function oneBabelPreset(api: BabelConfigAPI, options?: OneBabelPresetOptions): TransformOptions;
export {};
//# sourceMappingURL=index.d.ts.map