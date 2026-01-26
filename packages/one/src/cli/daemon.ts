// one daemon CLI command

import colors from 'picocolors'
import { labelProcess } from './label-process'

export async function daemon(args: {
  subcommand?: string
  port?: string
  host?: string
  app?: string
  slot?: string
  project?: string
}) {
  const subcommand = args.subcommand || 'run'

  switch (subcommand) {
    case 'run':
    case 'start':
      return daemonStart(args)

    case 'stop':
      return daemonStop()

    case 'status':
      return daemonStatus()

    case 'route':
      return daemonRoute(args)

    default:
      console.log(`Unknown daemon subcommand: ${subcommand}`)
      console.log('Available: start, stop, status, route')
      process.exit(1)
  }
}

async function daemonStart(args: { port?: string; host?: string }) {
  labelProcess('daemon')

  const { isDaemonRunning } = await import('../daemon/ipc')

  if (await isDaemonRunning()) {
    console.log(colors.yellow('Daemon is already running'))
    console.log("Use 'one daemon status' to see registered servers")
    process.exit(1)
  }

  const { startDaemon } = await import('../daemon/server')

  await startDaemon({
    port: args.port ? parseInt(args.port, 10) : undefined,
    host: args.host,
  })
}

async function daemonStop() {
  const { isDaemonRunning, getSocketPath, cleanupSocket } = await import('../daemon/ipc')

  if (!(await isDaemonRunning())) {
    console.log(colors.yellow('Daemon is not running'))
    process.exit(1)
  }

  // send shutdown signal via IPC
  // for now, just cleanup socket and let user stop the process manually
  console.log(colors.yellow('Note: daemon runs in foreground. Press Ctrl+C in the daemon terminal to stop.'))
  console.log(colors.dim(`Socket path: ${getSocketPath()}`))
}

async function daemonStatus() {
  const { isDaemonRunning, getDaemonStatus } = await import('../daemon/ipc')

  if (!(await isDaemonRunning())) {
    console.log(colors.yellow('Daemon is not running'))
    console.log(colors.dim("Start with 'one daemon'"))
    process.exit(1)
  }

  try {
    const status = await getDaemonStatus()

    console.log(colors.cyan('\n═══════════════════════════════════════════════════'))
    console.log(colors.cyan('  one daemon status'))
    console.log(colors.cyan('═══════════════════════════════════════════════════\n'))

    if (status.servers.length === 0) {
      console.log(colors.dim('  No servers registered'))
    } else {
      console.log('  Registered servers:')
      for (const server of status.servers) {
        const shortRoot = server.root.replace(process.env.HOME || '', '~')
        console.log(
          `    ${colors.green(server.id)} ${server.bundleId} → :${server.port} (${shortRoot})`
        )
      }
    }

    if (status.routes.length > 0) {
      console.log('\n  Active routes:')
      for (const route of status.routes) {
        console.log(`    ${route.key} → ${route.serverId}`)
      }
    }

    console.log('')
  } catch (err) {
    console.log(colors.red('Failed to get daemon status'))
    console.error(err)
    process.exit(1)
  }
}

async function daemonRoute(args: { app?: string; slot?: string; project?: string }) {
  const { isDaemonRunning, getDaemonStatus, setDaemonRoute, clearDaemonRoute } = await import(
    '../daemon/ipc'
  )

  if (!(await isDaemonRunning())) {
    console.log(colors.yellow('Daemon is not running'))
    process.exit(1)
  }

  if (!args.app) {
    console.log(colors.red('Missing --app parameter'))
    console.log("Usage: one daemon route --app=com.example.app --slot=0")
    console.log("   or: one daemon route --app=com.example.app --project=~/myapp")
    process.exit(1)
  }

  const status = await getDaemonStatus()

  // find the server to route to
  let targetServer: (typeof status.servers)[0] | undefined

  if (args.slot !== undefined) {
    // route by slot (index in server list)
    const slotIndex = parseInt(args.slot, 10)
    const matchingServers = status.servers.filter((s) => s.bundleId === args.app)

    if (slotIndex < 0 || slotIndex >= matchingServers.length) {
      console.log(colors.red(`Invalid slot: ${args.slot}`))
      console.log(`Available slots for ${args.app}: 0-${matchingServers.length - 1}`)
      process.exit(1)
    }

    targetServer = matchingServers[slotIndex]
  } else if (args.project) {
    // route by project path
    const normalizedProject = args.project.replace(/^~/, process.env.HOME || '')
    targetServer = status.servers.find(
      (s) => s.bundleId === args.app && s.root === normalizedProject
    )

    if (!targetServer) {
      console.log(colors.red(`No server found for ${args.app} at ${args.project}`))
      process.exit(1)
    }
  } else {
    console.log(colors.red('Missing --slot or --project parameter'))
    process.exit(1)
  }

  await setDaemonRoute(args.app, targetServer.id)
  const shortRoot = targetServer.root.replace(process.env.HOME || '', '~')
  console.log(colors.green(`Route set: ${args.app} → ${targetServer.id} (${shortRoot})`))
}
