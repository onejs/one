import colors from 'picocolors'
import { setServerGlobals } from '../server/setServerGlobals'
import { virtualEntryIdNative } from '../vite/plugins/virtualEntryConstants'
import { checkNodeVersion } from './checkNodeVersion'
import { labelProcess } from './label-process'

const DEFAULT_PORT = 8081
const DAEMON_PORT = 8081

export async function dev(args: {
  clean?: boolean
  host?: string
  port?: string
  https?: boolean
  mode?: 'development' | 'production'
  debugBundle?: string
  debug?: string
}) {
  labelProcess('dev')
  checkNodeVersion()
  setServerGlobals()

  const root = process.cwd()
  let daemonServerId: string | undefined
  let useDaemon = false
  let effectivePort = args.port ? +args.port : DEFAULT_PORT

  // check if daemon is running
  const { isDaemonRunning, registerWithDaemon, unregisterFromDaemon } = await import(
    '../daemon/ipc'
  )
  const { getBundleIdFromConfig, getAvailablePort } = await import('../daemon/utils')

  const daemonRunning = await isDaemonRunning()
  const bundleId = getBundleIdFromConfig(root)

  if (daemonRunning && !args.port) {
    // daemon is running and no explicit port - register with daemon
    if (bundleId) {
      // find an available port that's not 8081 (daemon's port)
      effectivePort = await getAvailablePort(8082, DAEMON_PORT)

      console.log(colors.cyan(`[daemon] Detected running daemon on :${DAEMON_PORT}`))
      console.log(colors.cyan(`[daemon] Using port :${effectivePort} for this server`))

      useDaemon = true
    } else {
      console.log(
        colors.yellow(
          '[daemon] No bundleIdentifier found in app.json, running standalone on :8081'
        )
      )
    }
  }

  const { dev } = await import('vxrn/dev')

  const { start, stop } = await dev({
    mode: args.mode,
    clean: args.clean,
    root,
    debugBundle: args.debugBundle,
    debug: args.debug,
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
        port: effectivePort,
        bundleId,
        root,
      })
      console.log(
        colors.green(
          `[daemon] Registered as ${bundleId} (${daemonServerId}) → accessible via :${DAEMON_PORT}`
        )
      )
    } catch (err) {
      console.log(colors.yellow(`[daemon] Failed to register: ${err}`))
    }
  }

  const cleanup = async () => {
    // unregister from daemon
    if (daemonServerId) {
      try {
        await unregisterFromDaemon(daemonServerId)
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
