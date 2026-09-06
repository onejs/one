import type { PluginOption } from 'vite';
import type { loadConfig as loadConfigT } from 'metro';
import type { TransformOptions } from '../transformer/babel-core';
type MetroYargArguments = Parameters<typeof loadConfigT>[0];
type MetroInputConfig = Parameters<typeof loadConfigT>[1];
export type MetroPluginOptions = {
    argv?: MetroYargArguments;
    defaultConfigOverrides?: MetroInputConfig | ((defaultConfig: MetroInputConfig) => MetroInputConfig);
    /**
     * Shorthand for setting `useWatchman` in Metro's resolver config.
     * When true, enables Watchman for file watching. When false, disables it.
     */
    watchman?: boolean;
    /**
     * Array of module names or glob patterns that should be resolved to an empty module.
     * This is useful for excluding modules that break the React Native build.
     *
     * Supports glob patterns via micromatch:
     * - Exact match: `'jsonwebtoken'`
     * - Wildcard: `'@aws-sdk/*'`
     * - Multiple wildcards: `'@aws-sdk/**'`
     *
     * Example: `['node:http2', 'jsonwebtoken', '@aws-sdk/*']`
     */
    excludeModules?: string[];
    /** Consider using babelConfigOverrides instead */
    babelConfig?: TransformOptions;
    babelConfigOverrides?: (defaultConfig: TransformOptions) => TransformOptions;
    /**
     * Module ids of transforms to run on the native transform path
     * (`ONE_METRO_NATIVE_TRANSFORMS=1`), which runs no babel at all. Each module
     * default-exports a `NativeTransform`: `(code, ctx) => string | null`. They
     * run in order, after one's own ports and before dependency extraction.
     *
     * This is how a babel plugin that has no native port gets replaced rather
     * than dropped. The worker refuses to build when it sees a babel plugin it
     * cannot run, so porting it here is the way through.
     */
    nativeTransformModules?: string[];
    /**
     * internal marker used by one's babel preset to avoid double-applying its
     * plugin chain when one already supplied the vite metro babel config.
     */
    oneViteMetroBabelConfig?: boolean;
    /**
     * Overrides the main module name which is normally defined as the `main` field in `package.json`.
     *
     * This will affect how `/.expo/.virtual-metro-entry.bundle` behaves.
     *
     * It can be used to change the entry point of the React Native app without the need of using
     * the `main` field in `package.json`.
     */
    mainModuleName?: string;
    /**
     * Controls when Metro bundler starts:
     * - 'eager' (default): Start Metro as soon as Vite server is listening
     * - 'lazy': Defer Metro startup until a bundle request or simulator connection is detected
     *
     * Use 'lazy' to speed up dev server startup when you don't always need Metro.
     */
    startup?: 'eager' | 'lazy';
    /**
     * Use custom native transforms (0% Babel worker) for Metro bundling.
     */
    nativeTransforms?: boolean;
};
export declare function metroPlugin(options?: MetroPluginOptions): PluginOption;
export {};
//# sourceMappingURL=metroPlugin.d.ts.map