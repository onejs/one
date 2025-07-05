import type { ResolvedConfig } from 'vite'
import type { MetroPluginOptions } from '../../plugins/metroPlugin'
import { getMetroConfigFromViteConfig } from '../../metro-config/getMetroConfigFromViteConfig'
import { buildBundleWithConfig } from './buildBundleWithConfig'
import { patchMetroServerWithMetroPluginOptions } from '../../metro-config/patchMetroServerWithMetroPluginOptions'
import { projectResolve } from '../../utils/projectImport'
import type { BundleCommandArgs } from './types'

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
      patchMetroServerWithMetroPluginOptions(server, metroPluginOptions)
    },
  })

  console.info('Done.')

  // Prevent the process not getting exited for some unknown reason.
  // If the process is not exited, it might hang the native build process.
  setTimeout(() => {
    console.info('Exiting process to prevent hanging.')
    process.exit()
  }, 3000)
}
