import './polyfills-server'

import FSExtra from 'fs-extra'
import type { VXRNOptions } from 'vxrn'
import { setupBuildInfo } from './server/setupBuildOptions'
import { ensureExists } from './utils/ensureExists'
import type { One } from './vite/types'

process.on('uncaughtException', (err) => {
  console.error(`[one] Uncaught exception`, err?.stack || err)
})

export async function serve(args: VXRNOptions['server'] = {}) {
  const buildInfo = (await FSExtra.readJSON(`dist/buildInfo.json`)) as One.BuildInfo
  const { oneOptions } = buildInfo

  setupBuildInfo(buildInfo)
  ensureExists(oneOptions)

  // to avoid loading the CACHE_KEY before we set it use async imports:
  const { labelProcess } = await import('./cli/label-process')
  const { removeUndefined } = await import('./utils/removeUndefined')
  const { loadEnv, serve: vxrnServe } = await import('vxrn/serve')
  const { oneServe } = await import('./server/oneServe')

  labelProcess('serve')

  if (args.loadEnv) {
    await loadEnv('production')
  }

  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'

  return await vxrnServe({
    // fallback to one plugin
    ...oneOptions.server,
    // override with any flags given to cli
    ...removeUndefined({
      port: args.port ? +args.port : undefined,
      host: args.host,
      compress: args.compress,
      platform: args.platform,
    }),

    async beforeRegisterRoutes(options, app) {
      await oneServe(oneOptions, buildInfo, app)
    },

    async afterRegisterRoutes(options, app) {},
  })
}
