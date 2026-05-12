import { type MetroConfigLike } from './buildOneMetroResolverOverrides';
export type WithOneOptions = {
    /** Absolute path to the project root. Defaults to `process.cwd()`. */
    projectRoot?: string;
};
/**
 * Apply One's Metro resolver overrides to a base Metro config.
 *
 * Use this from a project's `metro.config.cjs` so that `expo export`,
 * `eas update`, and other Metro-direct workflows produce byte-equivalent
 * bundles to what `vxrn`/`one dev`/`one build` produce internally.
 *
 * @example
 * ```js
 * // metro.config.cjs
 * const { getDefaultConfig } = require('expo/metro-config')
 * const { withOne } = require('one/metro-config')
 *
 * module.exports = withOne(getDefaultConfig(__dirname))
 * ```
 */
export declare function withOne<T extends MetroConfigLike>(defaultConfig: T, options?: WithOneOptions): T;
export default withOne;
//# sourceMappingURL=withOne.d.ts.map