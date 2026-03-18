import './polyfills-server'

import cluster from 'node:cluster'
import { cpus } from 'node:os'
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
  args: VXRNOptions['server'] & { app?: Hono; outDir?: string } = {}
) {
  const numWorkers = Number(process.env.ONE_WORKERS) || cpus().length
  const useCluster = numWorkers > 1 && !process.env.ONE_NO_CLUSTER

  if (useCluster && cluster.isPrimary) {
    // validate port before forking workers
    const port = args.port ? +args.port : 3000
    const net = await import('node:net')
    await new Promise<void>((resolve, reject) => {
      const s = net.createServer()
      s.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use.`))
        } else {
          reject(err)
        }
      })
      s.listen(port, () => {
        s.close(() => resolve())
      })
    })

    console.info(`[one] cluster: starting ${numWorkers} workers`)

    for (let i = 0; i < numWorkers; i++) {
      cluster.fork()
    }

    // restart crashed workers with backoff protection
    let recentCrashes = 0
    let lastCrashTime = 0

    cluster.on('exit', (worker, code, signal) => {
      // graceful shutdown — don't restart
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
      setTimeout(() => cluster.fork(), Math.min(recentCrashes * 500, 5000))
    })

    // forward signals to workers for graceful shutdown
    const shutdown = () => {
      for (const id in cluster.workers) {
        cluster.workers[id]?.process.kill('SIGTERM')
      }
      setTimeout(() => process.exit(0), 5000)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    return
  }

  // worker (or single-process mode): run the full server
  const outDir =
    args.outDir || (FSExtra.existsSync('buildInfo.json') ? '.' : null) || 'dist'
  const buildInfo = (await FSExtra.readJSON(`${outDir}/buildInfo.json`)) as One.BuildInfo
  const { oneOptions } = buildInfo

  setServerGlobals()
  setupBuildInfo(buildInfo)
  ensureExists(oneOptions)

  // to avoid loading the CACHE_KEY before we set it use async imports:
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
    // fallback to one plugin
    ...oneOptions.server,
    // override with any flags given to cli
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
