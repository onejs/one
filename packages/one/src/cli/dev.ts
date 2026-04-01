import * as path from 'node:path'
import colors from 'picocolors'
import { setServerGlobals } from '../server/setServerGlobals'
import { virtualEntryIdNative } from '../vite/plugins/virtualEntryConstants'
import { checkNodeVersion } from './checkNodeVersion'
import { labelProcess } from './label-process'

const DAEMON_PORT = 8081

export async function dev(args: {
  clean?: boolean
  host?: string
  port?: string
  https?: boolean
  mode?: 'development' | 'production'
  debugBundle?: string
  debug?: string
  extraConfig?: string
}) {
  labelProcess('dev')
  checkNodeVersion()
  setServerGlobals()

  const root = process.cwd()
  let daemonServerId: string | undefined
  let useDaemon = false
  // port priority: ONE_FORCE_PORT > --port > ONE_PORT > default
  const forcePort = process.env.ONE_FORCE_PORT ? +process.env.ONE_FORCE_PORT : undefined
  const envPort = process.env.ONE_PORT ? +process.env.ONE_PORT : undefined
  let effectivePort: number | undefined =
    forcePort ?? (args.port ? +args.port : undefined) ?? envPort

  // check if daemon is running
  const {
    isDaemonRunning,
    registerWithDaemon,
    unregisterFromDaemon,
    writeServerFile,
    removeServerFile,
  } = await import('../daemon/ipc')
  const { getBundleIdFromConfig, getAvailablePort } = await import('../daemon/utils')

  const daemonRunning = await isDaemonRunning()
  // use bundleId from config, or fallback to folder name
  const bundleId = getBundleIdFromConfig(root) || path.basename(root)

  if (daemonRunning) {
    if (!effectivePort || effectivePort === DAEMON_PORT) {
      // no port specified, or user requested the daemon port - use daemon mode
      effectivePort = await getAvailablePort(8082, DAEMON_PORT)

      console.log(colors.cyan(`[daemon] Detected running daemon on :${DAEMON_PORT}`))
      console.log(colors.cyan(`[daemon] Using port :${effectivePort} for this server`))
      useDaemon = true
    }
    // otherwise, explicit port (CLI or env) takes precedence — skip daemon
  }

  const { dev } = await import('vxrn/dev')

  const { start, stop } = await dev({
    mode: args.mode,
    clean: args.clean,
    root,
    debugBundle: args.debugBundle,
    debug: args.debug,
    extraConfig: args.extraConfig,
    server: {
      host: args.host,
      port: effectivePort,
    },
    entries: {
      native: virtualEntryIdNative,
    },
  })

  const { closePromise } = await start()

  // register with daemon after server starts
  if (useDaemon && bundleId) {
    try {
      daemonServerId = await registerWithDaemon({
        port: effectivePort!,
        bundleId,
        root,
      })
      console.log(
        colors.green(
          `[daemon] Registered as ${bundleId} (${daemonServerId}) → accessible via :${DAEMON_PORT}`
        )
      )
      // persist for daemon restart recovery
      writeServerFile({ port: effectivePort!, bundleId, root, pid: process.pid })
    } catch (err) {
      console.log(colors.yellow(`[daemon] Failed to register: ${err}`))
    }
  }

  const cleanup = async () => {
    // unregister from daemon
    if (daemonServerId) {
      try {
        await unregisterFromDaemon(daemonServerId)
        removeServerFile(root)
      } catch {
        // ignore errors during cleanup
      }
    }
    await stop()
  }

  process.on('beforeExit', () => {
    cleanup()
  })

  process.on('SIGINT', async () => {
    try {
      await cleanup()
    } finally {
      process.exit(2)
    }
  })

  process.on('SIGTERM', async () => {
    try {
      await cleanup()
    } finally {
      process.exit(0)
    }
  })

  process.on('uncaughtException', (err) => {
    console.error(err?.message || err)
  })

  // Prevent syntax errors in user's code from crashing the dev server.
  // TODO: It seems that Vite CLI isn't doing this and is using another way
  // to prevent such crashes. May need to investigate further.
  process.on('unhandledRejection', (err) => {
    console.error(err)
  })

  await closePromise
}
