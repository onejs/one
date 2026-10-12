export type WithOneOptions = {
    /** Absolute path to the project root. Defaults to `process.cwd()`. */
    projectRoot?: string;
    /** Router root folder relative to the project root. Defaults to `'app'`. */
    routerRoot?: string;
    /** Patterns to exclude from router file resolution. */
    ignoredRouteFiles?: Array<`**/*${string}`>;
    /** Routing linking config, mirrors `one({ router: { linking } })`. */
    linking?: unknown;
    /** Native setup file path relative to the project root. */
    setupFile?: string | {
        native?: string;
        ios?: string;
        android?: string;
    };
    /**
     * Load the app's vite.config and use the real One native Metro options.
     * Defaults to true so an ejected Metro config matches One's own native path.
     */
    loadViteConfig?: boolean;
};
/**
 * Produce a Metro config that invokes the same `getMetroConfigFromViteConfig`
 * pipeline that One's native production builds use.
 *
 * The first argument may be a project root. Object input is ignored because
 * the production pipeline loads React Native's Metro defaults internally.
 *
 * @example
 * ```js
 * // metro.config.cjs
 * const { withOne } = require('one/metro-config')
 *
 * module.exports = withOne(__dirname)
 * ```
 */
export declare function withOne(baseConfigOrProjectRoot: string | object | undefined, options?: WithOneOptions): Promise<unknown>;
export default withOne;
//# sourceMappingURL=withOne.d.ts.map