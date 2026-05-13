import './polyfills-server'

import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import type { VXRNOptions } from 'vxrn'
import { setServerGlobals } from './server/setServerGlobals'
import { setupBuildInfo } from './server/setupBuildOptions'
import { ensureExists } from './utils/ensureExists'
import type { One } from './vite/types'

// formatErrorSafely + the prepareStackTrace guard prevent a buggy transitive
// formatter (source-map-support without recursion guard) from pinning the
// serve process forever. see cli/install-error-handlers.ts for the full
// story behind the 9-day Onejs:build zombies on the soot CI runner.
import {
  formatErrorSafely,
  installPrepareStackTraceGuard,
} from './cli/install-error-handlers'

installPrepareStackTraceGuard()

process.on('uncaughtException', (err) => {
  try {
    process.stderr.write(`[one serve] uncaught exception\n${formatErrorSafely(err)}\n`)
  } catch {}
})

process.on('unhandledRejection', (reason) => {
  try {
    process.stderr.write(
      `[one serve] unhandled rejection\n${formatErrorSafely(reason)}\n`
    )
  } catch {}
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
    const { cpus, platform } = await import('node:os')
    const numWorkers = typeof args.cluster === 'number' ? args.cluster : cpus().length

    const isBun = typeof process.versions.bun !== 'undefined'

    // check if we can use SO_REUSEPORT (linux with node 22.12+ or bun)
    const canReusePort =
      !['win32', 'darwin'].includes(platform()) &&
      (isBun ||
        (() => {
          const [major, minor] = process.versions.node.split('.').map(Number)
          return major > 22 || (major === 22 && minor >= 12) || major >= 23
        })())

    if (canReusePort) {
      // SO_REUSEPORT: spawn independent child processes, each binds to port directly
      // kernel distributes connections - no IPC bottleneck
      return await serveWithReusePort(args, numWorkers)
    } else if (!isBun) {
      // node cluster module (IPC-based, works on macOS with node)
      return await serveWithCluster(args, numWorkers)
    } else {
      // bun on macOS/windows: cluster not supported, fall back to single process
      console.warn(
        `[one] cluster mode not supported on ${platform()} with bun, running single process`
      )
      return await startWorker(args)
    }
  }

  // single-process mode
  return await startWorker(args)
}

async function serveWithReusePort(args: Parameters<typeof serve>[0], numWorkers: number) {
  const { fork } = await import('node:child_process')

  console.info(`[one] cluster: starting ${numWorkers} workers (SO_REUSEPORT)`)

  const workers: ReturnType<typeof fork>[] = []
  let recentCrashes = 0
  let lastCrashTime = 0

  function spawnWorker() {
    const child = fork(
      process.argv[1]!,
      process.argv.slice(2).filter((a) => !a.startsWith('--cluster')),
      {
        env: { ...process.env, ONE_CLUSTER_WORKER: '1' },
        stdio: 'inherit',
      }
    )
    workers.push(child)

    child.on('exit', (code, signal) => {
      const idx = workers.indexOf(child)
      if (idx >= 0) workers.splice(idx, 1)

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
        `[one] worker ${child.pid} died (code ${code}, signal ${signal}), restarting`
      )
      setTimeout(spawnWorker, Math.min(recentCrashes * 500, 5000))
    })
  }

  for (let i = 0; i < numWorkers; i++) {
    spawnWorker()
  }

  const shutdown = () => {
    for (const w of workers) {
      w.kill('SIGTERM')
    }
    setTimeout(() => process.exit(0), 5000)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // keep primary alive
  await new Promise(() => {})
}

async function serveWithCluster(args: Parameters<typeof serve>[0], numWorkers: number) {
  const cluster = await import('node:cluster')

  if (cluster.default.isPrimary) {
    console.info(`[one] cluster: starting ${numWorkers} workers (IPC)`)

    for (let i = 0; i < numWorkers; i++) {
      cluster.default.fork()
    }

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

  // cluster worker
  return await startWorker(args)
}

async function startWorker(args: Parameters<typeof serve>[0]) {
  // Resolve outDir with the same precedence chain the `build` command uses
  // (matching cli/build.ts:370 — `viteLoadedConfig?.config?.build?.outDir ?? 'dist'`):
  //   1. --outDir CLI flag
  //   2. cwd has buildInfo.json — preserves the "cd into output dir then run" UX
  //   3. vite.config's build.outDir
  //   4. 'dist' fallback
  // Step (3) only runs when (1)-(2) miss; loading vite.config is non-trivial
  // and not worth it for the common case where the cwd already has buildInfo.json.
  let outDir = args?.outDir
  if (!outDir && FSExtra.existsSync('buildInfo.json')) {
    outDir = '.'
  }
  if (!outDir) {
    // Read `build.outDir` from vite.config. Lives in `./vite/loadConfig` so the
    // `vite` import is in a file the build tool compiles cleanly (the same
    // bare-package rewrite affects this file but not loadConfig).
    try {
      const { loadViteBuildOutDir } = await import('./vite/loadConfig')
      outDir = await loadViteBuildOutDir()
    } catch {
      // No vite.config (or it failed to load); fall through to default.
    }
  }
  outDir = outDir || 'dist'
  const buildInfo = (await FSExtra.readJSON(`${outDir}/buildInfo.json`)) as One.BuildInfo
  const { oneOptions } = buildInfo

  setServerGlobals()
  setupBuildInfo(buildInfo)
  ensureExists(oneOptions)

  const { labelProcess } = await import('./cli/label-process')
  const { removeUndefined } = await import('./utils/removeUndefined')
  const {
    loadEnv,
    serve: vxrnServe,
    serveStaticAssets,
    compileCacheRules,
  } = await import('vxrn/serve')
  const { oneServe } = await import('./server/oneServe')

  labelProcess('serve')

  if (args?.loadEnv) {
    await loadEnv('production')
  }

  // compile cache rules once at startup so every request is a single regex test
  const cacheRules = oneOptions.server?.cacheControl
    ? compileCacheRules(oneOptions.server.cacheControl)
    : undefined

  return await vxrnServe({
    outDir: buildInfo.outDir || outDir,
    app: args?.app,
    ...oneOptions.server,
    ...removeUndefined({
      port: args?.port ? +args.port : undefined,
      host: args?.host,
      compress: args?.compress,
    }),

    async beforeRegisterRoutes(options, app) {
      await oneServe(oneOptions, buildInfo, app, {
        serveStaticAssets: (ctx) => serveStaticAssets({ ...ctx, cacheRules }),
      })
    },

    async afterRegisterRoutes(options, app) {},
  })
}
