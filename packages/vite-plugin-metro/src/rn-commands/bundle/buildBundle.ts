import type { ResolvedConfig } from 'vite'
import type { MetroPluginOptions } from '../../plugins/metroPlugin'
import { getMetroConfigFromViteConfig } from '../../metro-config/getMetroConfigFromViteConfig'
import { buildBundleWithConfig } from './buildBundleWithConfig'
import { patchMetroServerWithViteConfigAndMetroPluginOptions } from '../../metro-config/patchMetroServerWithViteConfigAndMetroPluginOptions'
import { projectResolve } from '../../utils/projectImport'
import type { BundleCommandArgs } from './types'
import { ensureProcessExitsAfterDelay } from '../../utils/exit'

export async function buildBundle(
  this: { viteConfig: ResolvedConfig; metroPluginOptions: MetroPluginOptions },
  _argv: Array<string>,
  ctx: any,
  argsIn: BundleCommandArgs,
  bundleImpl: any = null
): Promise<void> {
  const { viteConfig, metroPluginOptions } = this || {}
  if (!viteConfig) {
    throw new Error(
      '[vxrn/buildBundle.metro] Expect the buildBundle function to be bind with an object that has viteConfig property.'
    )
  }
  if (!metroPluginOptions) {
    throw new Error(
      '[vxrn/buildBundle.metro] Expect the buildBundle function to be bind with an object that has metroPluginOptions property.'
    )
  }

  if (process.env.IS_VXRN_CLI) {
    throw new Error(
      'IS_VXRN_CLI should not be set while using @vxrn/vite-plugin-metro buildBundle, it is not supported'
    )
  }

  const metroConfig = await getMetroConfigFromViteConfig(viteConfig, metroPluginOptions)

  const args = {
    ...argsIn,
    entryFile: metroPluginOptions.mainModuleName
      ? projectResolve(viteConfig.root, metroPluginOptions.mainModuleName)
      : argsIn.entryFile,
  }

  await buildBundleWithConfig(args, metroConfig, undefined, {
    patchServer: (server) => {
      patchMetroServerWithViteConfigAndMetroPluginOptions(server, viteConfig, metroPluginOptions)
    },
  })

  console.info('Done.')

  ensureProcessExitsAfterDelay()
}
