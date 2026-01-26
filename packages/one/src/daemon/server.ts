// main daemon HTTP/WebSocket server

import * as http from 'node:http'
import type { DaemonState, ServerRegistration } from './types'
import {
  createRegistry,
  findServersByBundleId,
  findServerById,
  getAllServers,
  getRoute,
  setRoute,
} from './registry'
import { createIPCServer, getSocketPath, cleanupSocket } from './ipc'
import { proxyHttpRequest, proxyWebSocket } from './proxy'
import { pickServer, getBootedSimulators, resolvePendingPicker } from './picker'
import colors from 'picocolors'

const DEFAULT_PORT = 8081

interface DaemonOptions {
  port?: number
  host?: string
}

export async function startDaemon(options: DaemonOptions = {}) {
  const port = options.port || DEFAULT_PORT
  const host = options.host || '0.0.0.0'

  const state = createRegistry()

  // pending requests waiting for picker selection (for future use)
  // const pendingRequests: Map<string, {...}[]> = new Map()

  // start IPC server for CLI communication
  const ipcServer = createIPCServer(
    state,
    (id) => {
      const server = findServerById(state, id)
      if (server) {
        const shortRoot = server.root.replace(process.env.HOME || '', '~')
        console.log(
          colors.green(`[daemon] Server registered: ${server.bundleId} → :${server.port} (${shortRoot})`)
        )
      }
    },
    (id) => {
      console.log(colors.yellow(`[daemon] Server unregistered: ${id}`))
    }
  )

  // create HTTP server
  const httpServer = http.createServer(async (req, res) => {
    // daemon management endpoints
    if (req.url?.startsWith('/__daemon')) {
      await handleDaemonEndpoint(req, res, state)
      return
    }

    // parse app from query string
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const bundleId = url.searchParams.get('app')

    // if no bundleId, check if only one server is registered
    const servers = bundleId
      ? findServersByBundleId(state, bundleId)
      : getAllServers(state)

    if (servers.length === 0) {
      res.writeHead(404)
      res.end(
        bundleId
          ? `No server registered for app: ${bundleId}`
          : 'No servers registered with daemon'
      )
      return
    }

    if (servers.length === 1) {
      // single match, proxy directly
      proxyHttpRequest(req, res, servers[0])
      return
    }

    // multiple matches - check for pre-configured route
    const routeKey = bundleId || 'default'
    const existingRoute = getRoute(state, routeKey)

    if (existingRoute) {
      const server = findServerById(state, existingRoute.serverId)
      if (server) {
        proxyHttpRequest(req, res, server)
        return
      }
      // route exists but server is gone, fall through to picker
    }

    // check if running in CI/non-interactive mode - use first match with warning
    if (!process.stdin.isTTY || process.env.CI) {
      console.log(
        colors.yellow(
          `[daemon] Non-interactive mode: routing ${bundleId} to first match (${servers[0].root})`
        )
      )
      console.log(
        colors.yellow(
          `[daemon] Use 'one daemon route --app=${bundleId} --slot=N' to configure routing`
        )
      )
      proxyHttpRequest(req, res, servers[0])
      return
    }

    // show picker with timeout for interactive selection
    const PICKER_TIMEOUT = 30000 // 30 seconds

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Picker timeout')), PICKER_TIMEOUT)
    })

    try {
      const { server, remember } = await Promise.race([
        pickServer(routeKey, servers),
        timeoutPromise,
      ])

      if (remember) {
        setRoute(state, routeKey, server.id)
        console.log(colors.blue(`[daemon] Route saved: ${routeKey} → ${server.id}`))
      }

      proxyHttpRequest(req, res, server)
    } catch (err) {
      // picker cancelled or timed out - use first match
      console.log(
        colors.yellow(
          `[daemon] Picker timeout/cancelled: routing to first match (${servers[0].root})`
        )
      )
      proxyHttpRequest(req, res, servers[0])
    }
  })

  // handle WebSocket upgrades
  httpServer.on('upgrade', async (req, rawSocket, head) => {
    const socket = rawSocket as import('node:net').Socket
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const bundleId = url.searchParams.get('app')

    const servers = bundleId
      ? findServersByBundleId(state, bundleId)
      : getAllServers(state)

    if (servers.length === 0) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n')
      return
    }

    let target: ServerRegistration | undefined

    if (servers.length === 1) {
      target = servers[0]
    } else {
      // check for pre-configured route
      const routeKey = bundleId || 'default'
      const existingRoute = getRoute(state, routeKey)

      if (existingRoute) {
        target = findServerById(state, existingRoute.serverId)
      }

      if (!target) {
        // for WebSocket, we can't really show a picker, so use first match
        // or wait for an HTTP request to establish the route
        console.log(
          colors.yellow(
            `[daemon] WebSocket upgrade with ambiguous route (${servers.length} servers), using first match`
          )
        )
        target = servers[0]
      }
    }

    if (target) {
      proxyWebSocket(req, socket, head, target)
    } else {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n')
    }
  })

  // start listening
  httpServer.listen(port, host, () => {
    console.log(colors.cyan('\n═══════════════════════════════════════════════════'))
    console.log(colors.cyan('  one daemon'))
    console.log(colors.cyan('═══════════════════════════════════════════════════'))
    console.log(`\n  Listening on ${colors.green(`http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)}`)
    console.log(`  IPC socket:  ${colors.dim(getSocketPath())}`)
    console.log('')
    console.log(colors.dim('  Waiting for dev servers to register...'))
    console.log(colors.dim("  Run 'one dev' in your project directories"))
    console.log('')
  })

  // graceful shutdown
  const shutdown = () => {
    console.log(colors.yellow('\n[daemon] Shutting down...'))
    httpServer.close()
    ipcServer.close()
    cleanupSocket()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return {
    httpServer,
    ipcServer,
    state,
    shutdown,
  }
}

async function handleDaemonEndpoint(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  state: DaemonState
) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  // GET /__daemon/status
  if (url.pathname === '/__daemon/status') {
    const servers = getAllServers(state)
    const simulators = await getBootedSimulators()

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify(
        {
          servers: servers.map((s) => ({
            id: s.id,
            port: s.port,
            bundleId: s.bundleId,
            root: s.root,
          })),
          simulators,
        },
        null,
        2
      )
    )
    return
  }

  // POST /__daemon/route?bundleId=...&serverId=...
  if (url.pathname === '/__daemon/route' && req.method === 'POST') {
    const bundleId = url.searchParams.get('bundleId')
    const serverId = url.searchParams.get('serverId')

    if (!bundleId || !serverId) {
      res.writeHead(400)
      res.end('Missing bundleId or serverId')
      return
    }

    const server = findServerById(state, serverId)
    if (!server) {
      res.writeHead(404)
      res.end('Server not found')
      return
    }

    setRoute(state, bundleId, serverId)

    // also resolve any pending picker
    resolvePendingPicker(bundleId, serverId)

    res.writeHead(200)
    res.end('Route set')
    return
  }

  res.writeHead(404)
  res.end('Not found')
}
