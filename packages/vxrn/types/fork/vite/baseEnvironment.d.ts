import type { Logger, ResolvedConfig } from 'vite';
type ResolvedEnvironmentOptions = any;
export declare function getDefaultResolvedEnvironmentOptions(config: ResolvedConfig): ResolvedEnvironmentOptions;
export declare class PartialEnvironment {
    name: string;
    getTopLevelConfig(): ResolvedConfig;
    config: ResolvedConfig & ResolvedEnvironmentOptions;
    /**
     * @deprecated use environment.config instead
     **/
    get options(): ResolvedEnvironmentOptions;
    logger: Logger;
    /**
     * @internal
     */
    _options: ResolvedEnvironmentOptions;
    /**
     * @internal
     */
    _topLevelConfig: ResolvedConfig;
    constructor(name: string, topLevelConfig: ResolvedConfig, options?: ResolvedEnvironmentOptions);
}
export declare class BaseEnvironment extends PartialEnvironment {
    get plugins(): Plugin[];
    /**
     * @internal
     */
    _plugins: Plugin[] | undefined;
    /**
     * @internal
     */
    _initiated: boolean;
    constructor(name: string, config: ResolvedConfig, options?: ResolvedEnvironmentOptions);
}
/**
 * This class discourages users from inversely checking the `mode`
 * to determine the type of environment, e.g.
 *
 * ```js
 * const isDev = environment.mode !== 'build' // bad
 * const isDev = environment.mode === 'dev'   // good
 * ```
 *
 * You should also not check against `"unknown"` specfically. It's
 * a placeholder for more possible environment types.
 */
export declare class UnknownEnvironment extends BaseEnvironment {
    mode: "unknown";
}
export {};
//# sourceMappingURL=baseEnvironment.d.ts.map