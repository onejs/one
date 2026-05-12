export type WithOneOptions = {
    /** Absolute path to the project root. Defaults to `process.cwd()`. */
    projectRoot?: string;
    /** Router root folder relative to the project root. Defaults to `'app'`. */
    routerRoot?: string;
    /** Patterns to exclude from router file resolution. */
    ignoredRouteFiles?: Array<`**/*${string}`>;
    /** Routing linking config — mirrors `one({ router: { linking } })`. */
    linking?: unknown;
    /** Native setup file path relative to the project root. */
    setupFile?: string | {
        native?: string;
        ios?: string;
        android?: string;
    };
};
/**
 * Produce a Metro config that invokes the EXACT same `getMetroConfigFromViteConfig`
 * pipeline that One's native production builds use. This way `expo export`,
 * `eas update`, and any other Metro-direct workflow produce a bundle that's
 * byte-equivalent to what `react-native bundle` (the iOS build phase) produces.
 *
 * The first argument is ignored — kept only for ergonomic compatibility with
 * the typical `withOne(getDefaultConfig(__dirname))` call shape that Expo
 * users are used to. We discard it because @expo/metro-config's defaults
 * differ from what One needs, and the production pipeline applies its own
 * defaults internally.
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