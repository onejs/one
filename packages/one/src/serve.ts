import './polyfills-server'

import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import type { VXRNOptions } from 'vxrn'
import { setServerGlobals } from './server/setServerGlobals'
import { setupBuildInfo } from './server/setupBuildOptions'
import { ensureExists } from './utils/ensureExists'
import type { One } from './vite/types'

process.on('uncaughtException', (err) => {
  console.error(`[one] Uncaught exception`, err?.stack || err)
})

export async function serve(
  args: VXRNOptions['server'] & {
    app?: Hono
    outDir?: string
    cluster?: boolean | number
  } = {}
) {
  // cluster mode: --cluster or --cluster=N
  if (args.cluster) {
    const cluster = await import('node:cluster')
    const { cpus } = await import('node:os')

    if (cluster.default.isPrimary) {
      const numWorkers = typeof args.cluster === 'number' ? args.cluster : cpus().length

      console.info(`[one] cluster: starting ${numWorkers} workers`)

      for (let i = 0; i < numWorkers; i++) {
        cluster.default.fork()
      }

      // restart crashed workers with backoff
      let recentCrashes = 0
      let lastCrashTime = 0

      cluster.default.on('exit', (worker, code, signal) => {
        if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') return

        const now = Date.now()
        if (now - lastCrashTime < 5000) {
          recentCrashes++
        } else {
          recentCrashes = 1
        }
        lastCrashTime = now

        if (recentCrashes > numWorkers * 2) {
          console.error(`[one] too many worker crashes, stopping`)
          process.exit(1)
        }

        console.error(
          `[one] worker ${worker.process.pid} died (code ${code}, signal ${signal}), restarting`
        )
        setTimeout(() => cluster.default.fork(), Math.min(recentCrashes * 500, 5000))
      })

      const shutdown = () => {
        for (const id in cluster.default.workers) {
          cluster.default.workers[id]?.process.kill('SIGTERM')
        }
        setTimeout(() => process.exit(0), 5000)
      }
      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)

      return
    }
  }

  // worker (or single-process mode)
  const outDir =
    args.outDir || (FSExtra.existsSync('buildInfo.json') ? '.' : null) || 'dist'
  const buildInfo = (await FSExtra.readJSON(`${outDir}/buildInfo.json`)) as One.BuildInfo
  const { oneOptions } = buildInfo

  setServerGlobals()
  setupBuildInfo(buildInfo)
  ensureExists(oneOptions)

  const { labelProcess } = await import('./cli/label-process')
  const { removeUndefined } = await import('./utils/removeUndefined')
  const { loadEnv, serve: vxrnServe, serveStaticAssets } = await import('vxrn/serve')
  const { oneServe } = await import('./server/oneServe')

  labelProcess('serve')

  if (args.loadEnv) {
    await loadEnv('production')
  }

  return await vxrnServe({
    outDir: buildInfo.outDir || outDir,
    app: args.app,
    ...oneOptions.server,
    ...removeUndefined({
      port: args.port ? +args.port : undefined,
      host: args.host,
      compress: args.compress,
    }),

    async beforeRegisterRoutes(options, app) {
      await oneServe(oneOptions, buildInfo, app, { serveStaticAssets })
    },

    async afterRegisterRoutes(options, app) {},
  })
}
