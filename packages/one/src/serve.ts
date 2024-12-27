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

  return await vxrnServe({
    server: {
      // fallback to one plugin
      ...oneOptions.server,
      // override with any flags given to cli
      ...removeUndefined({
        port: args.port ? +args.port : undefined,
        host: args.host,
        compress: args.compress,
        platform: args.platform,
        cacheHeaders: args.cacheHeaders,
      }),
    },

    async beforeStart(options, app) {
      await oneServe(oneOptions, options, buildInfo, app)
    },
  })
}
