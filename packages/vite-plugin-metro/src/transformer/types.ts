import type { ResolvedConfig } from 'vite'
import type { TransformOptions } from '@babel/core'

/**
 * A bag of stuff we will pass into Metro's transformFile function under the
 * `vite` key of `customTransformOptions`.
 */
export type ViteCustomTransformOptions = {
  /**
   * The Vite config object.
   */
  // config: ResolvedConfig
  /**
   * Additional Babel config to use, specified directly by user of the
   * Vite Metro plugin as the `babelConfig` option.
   */
  babelConfig?: TransformOptions
  /**
   * internal marker used by one's babel preset to avoid double-applying its
   * plugin chain when one already supplied the vite metro babel config.
   */
  oneViteMetroBabelConfig?: boolean
}
