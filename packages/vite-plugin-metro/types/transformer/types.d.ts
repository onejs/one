import type { TransformOptions } from '@babel/core';
/**
 * A bag of stuff we will pass into Metro's transformFile function under the
 * `vite` key of `customTransformOptions`.
 */
export type ViteCustomTransformOptions = {
    /**
     * The Vite config object.
     */
    /**
     * Additional Babel config to use, specified directly by user of the
     * Vite Metro plugin as the `babelConfig` option.
     */
    babelConfig?: TransformOptions;
    /**
     * internal marker used by one's babel preset to avoid double-applying its
     * plugin chain when one already supplied the vite metro babel config.
     */
    oneViteMetroBabelConfig?: boolean;
    /**
     * Module ids of the user's own native transforms, resolved from the project
     * root inside the metro worker. See `MetroPluginOptions.nativeTransformModules`.
     */
    nativeTransformModules?: string[];
};
/**
 * A native transform is what a babel plugin becomes when there is no babel.
 * It takes source and returns source, and is free to use oxc, a regex, or
 * anything else — it just must not be a babel plugin.
 */
export type NativeTransform = (code: string, context: {
    /** absolute path to the file being transformed */
    filename: string;
    platform: string | null | undefined;
    dev: boolean;
    projectRoot: string;
}) => string | null | undefined;
//# sourceMappingURL=types.d.ts.map