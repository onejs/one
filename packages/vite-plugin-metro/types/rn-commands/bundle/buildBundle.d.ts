import type { ResolvedConfig } from 'vite'
import type { MetroPluginOptions } from '../../plugins/metroPlugin'
import type { BundleCommandArgs } from './types'
export declare function buildBundle(
  this: {
    viteConfig: ResolvedConfig
    metroPluginOptions: MetroPluginOptions
  },
  _argv: Array<string>,
  ctx: any,
  argsIn: BundleCommandArgs,
  bundleImpl?: any
): Promise<void>
//# sourceMappingURL=buildBundle.d.ts.map
