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
  // Resolve outDir without loading the user's vite.config at serve time.
  //
  //   1. --outDir CLI flag (highest precedence)
  //   2. cwd has buildInfo.json — preserves the "cd into output dir then run" UX
  //   3. build-pointer marker written by `one build` — locates the build output
  //      when the user has a non-default `build.outDir` set in vite.config
  //   4. 'dist' fallback (matches the historical behaviour)
  //
  // Why not call `loadConfigFromFile` here directly: loading vite.config inside
  // `one serve` instantiates the One plugin chain (including `vxrnVitePlugin`
  // on the non-`IS_VXRN_CLI` branch), which has side effects — `configResolved`
  // hooks, file watchers, server middleware — that leak into the subsequent
  // `vxrn/serve` startup and break SPA client-side routing (confirmed via
  // diagnostic PR #710: removing this call made `test-spa-shell-routing` go
  // from 4-of-5 fails → 27/27 pass on the same CI infrastructure).
  let outDir = args?.outDir
  if (!outDir && FSExtra.existsSync('buildInfo.json')) {
    outDir = '.'
  }
  if (!outDir) {
    try {
      const pointer = (await FSExtra.readJSON(
        'node_modules/.cache/one/build-pointer.json'
      )) as { outDir?: string }
      // Verify the pointed-to dir actually has buildInfo.json. Guards against a
      // stale marker (e.g. user changed `build.outDir` and deleted the old
      // output dir without rebuilding). If the marker is stale, fall back to
      // 'dist' so the existing "buildInfo.json not found" error message at
      // least references the conventional location instead of a phantom dir
      // the user no longer recognises.
      if (
        pointer?.outDir &&
        (await FSExtra.pathExists(`${pointer.outDir}/buildInfo.json`))
      ) {
        outDir = pointer.outDir
      } else if (pointer?.outDir) {
        console.warn(
          `[one serve] build-pointer.json points to '${pointer.outDir}/' but no buildInfo.json there — falling back to 'dist'. Run \`one build\` to refresh the marker.`
        )
      }
    } catch {
      // No pointer (build hasn't been run yet, or built with an older `one`
      // that predates the pointer write) — fall through to 'dist'.
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
