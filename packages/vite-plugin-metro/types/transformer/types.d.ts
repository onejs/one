import type { TransformOptions } from "@babel/core";
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
};
//# sourceMappingURL=types.d.ts.map
