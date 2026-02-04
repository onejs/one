// main daemon HTTP/WebSocket server

import * as http from 'node:http'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const debugLogPath = path.join(os.homedir(), '.one', 'daemon-debug.log')
function debugLog(msg: string) {
  fs.appendFileSync(debugLogPath, `${new Date().toISOString()} ${msg}\n`)
}

// cache app names from config files
const serverAppNames = new Map<string, string>()

// try to get app name from app.json, app.config.ts, or fallback to dirname
async function getAppNameForServer(root: string): Promise<string | null> {
  // check cache first
  const cached = serverAppNames.get(root)
  if (cached) return cached

  try {
    // try app.json first
    const appJsonPath = path.join(root, 'app.json')
    if (fs.existsSync(appJsonPath)) {
      const content = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'))
      const name = content.expo?.name || content.name
      if (name) {
        serverAppNames.set(root, name)
        return name
      }
    }

    // try app.config.ts - execute it to get the config
    const appConfigTsPath = path.join(root, 'app.config.ts')
    if (fs.existsSync(appConfigTsPath)) {
      // read the file and look for name pattern
      const content = fs.readFileSync(appConfigTsPath, 'utf-8')
      // simple regex to find name: "..." or name: '...'
      const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/)
      if (nameMatch) {
        const name = nameMatch[1]
        serverAppNames.set(root, name)
        return name
      }
    }

    // try app.config.js
    const appConfigJsPath = path.join(root, 'app.config.js')
    if (fs.existsSync(appConfigJsPath)) {
      const content = fs.readFileSync(appConfigJsPath, 'utf-8')
      const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/)
      if (nameMatch) {
        const name = nameMatch[1]
        serverAppNames.set(root, name)
        return name
      }
    }

    // fallback to directory name
    const dirName = path.basename(root)
    if (dirName) {
      serverAppNames.set(root, dirName)
      return dirName
    }
  } catch (err) {
    debugLog(`Failed to get app name for ${root}: ${err}`)
  }

  return null
}

// unified mapping: tracks what we know about each client identifier
interface ClientInfo {
  serverId: string // the server this client should route to
  simulatorUdid?: string // the simulator (if known)
  matchedBy: 'user-agent' | 'tui' | 'auto' // how we learned this
}

const clientMappings = new Map<string, ClientInfo>()

// pending mappings: when TUI connects sim to server, map next request's identifiers
// key: serverId, value: simulatorUdid
const pendingMappings = new Map<string, string>()

// called by TUI when user manually connects a simulator to a server
export function setPendingMapping(serverId: string, simulatorUdid: string) {
  pendingMappings.set(serverId, simulatorUdid)
  debugLog(
    `Pending mapping: next request to server ${serverId} will map to sim ${simulatorUdid}`
  )
}

// clear ALL mappings for a specific simulator (called when TUI changes a cable)
export function clearMappingsForSimulator(simulatorUdid: string) {
  let count = 0
  for (const [key, info] of clientMappings) {
    if (info.simulatorUdid === simulatorUdid) {
      clientMappings.delete(key)
      count++
    }
  }
  debugLog(`Cleared ${count} mappings for simulator ${simulatorUdid}`)
}

// for backwards compat - clear all mappings (used sparingly)
export function clearAllMappings() {
  const count = clientMappings.size
  clientMappings.clear()
  debugLog(`Cleared all ${count} client mappings`)
}

// get all simulator -> server mappings (for TUI visualization)
export function getSimulatorMappings(): Map<string, string> {
  const result = new Map<string, string>()
  for (const [_key, info] of clientMappings) {
    if (info.simulatorUdid) {
      result.set(info.simulatorUdid, info.serverId)
    }
  }
  return result
}

// set a simulator -> server mapping directly (called by TUI when cable connects)
export function setSimulatorMapping(simulatorUdid: string, serverId: string) {
  // use a synthetic key for TUI-set mappings
  const key = `tui:${simulatorUdid}`
  clientMappings.set(key, {
    serverId,
    simulatorUdid,
    matchedBy: 'tui',
  })
  debugLog(`TUI set mapping: sim=${simulatorUdid} -> server=${serverId}`)
}

// try to match user-agent app name to a registered server
async function matchUserAgentToServer(
  headers: http.IncomingHttpHeaders,
  servers: ServerRegistration[]
): Promise<ServerRegistration | null> {
  const userAgent = headers['user-agent']
  if (!userAgent || typeof userAgent !== 'string') return null

  // extract app name from user-agent (first part before /)
  const uaAppName = userAgent.split('/')[0]
  if (!uaAppName) return null

  debugLog(`Trying to match user-agent app "${uaAppName}" to servers`)

  for (const server of servers) {
    const appName = await getAppNameForServer(server.root)
    if (!appName) continue

    // normalize names for comparison (remove spaces, lowercase)
    const normalizedUa = uaAppName.toLowerCase().replace(/\s+/g, '')
    const normalizedApp = appName.toLowerCase().replace(/\s+/g, '')

    debugLog(`  Comparing "${normalizedUa}" to server app "${normalizedApp}"`)

    // check if they match (exact or contains)
    if (
      normalizedUa === normalizedApp ||
      normalizedUa.includes(normalizedApp) ||
      normalizedApp.includes(normalizedUa)
    ) {
      debugLog(`  Matched! ${uaAppName} -> ${server.root}`)
      return server
    }
  }

  return null
}

// check if user-agent is generic expo go (can't identify the app)
function isGenericExpoAgent(ua: string): boolean {
  return ua.startsWith('Expo/') || ua.startsWith('Exponent/')
}

// extract app name from user-agent: "TakeoutDev/1 CFNetwork/..." -> "TakeoutDev"
function extractAppNameFromUA(ua: string): string | null {
  const firstPart = ua.split(' ')[0] || ''
  const appName = firstPart.split('/')[0]
  return appName || null
}

// track recent HTTP connections: remotePort -> serverId
// WebSocket from same port likely belongs to same app
const recentConnections = new Map<number, { serverId: string; timestamp: number }>()
const CONNECTION_MEMORY_MS = 5000 // remember connections for 5 seconds

// get the best identifier key for this request
function getPrimaryIdentifier(headers: http.IncomingHttpHeaders): string | null {
  const userAgent = headers['user-agent'] || ''

  // built apps have unique user-agent like "TakeoutDev/1"
  if (!isGenericExpoAgent(userAgent)) {
    const appName = extractAppNameFromUA(userAgent)
    if (appName) {
      return `app:${appName}`
    }
  }

  // expo go - use eas-client-id if available (highest confidence)
  const easClientId = headers['eas-client-id']
  if (easClientId && typeof easClientId === 'string') {
    return `eas:${easClientId}`
  }

  // fallback: use full user-agent as identifier (even for Expo Go)
  if (userAgent) {
    return `ua:${userAgent}`
  }

  return null
}

// result of looking up client info
interface ClientLookup {
  info: ClientInfo | null
  identifier: string | null
}

// look up what we know about this client
function lookupClient(headers: http.IncomingHttpHeaders): ClientLookup {
  const identifier = getPrimaryIdentifier(headers)
  if (!identifier) {
    return { info: null, identifier: null }
  }

  const info = clientMappings.get(identifier)
  return { info: info || null, identifier }
}

// save client info
function saveClientMapping(
  identifier: string,
  serverId: string,
  simulatorUdid: string | undefined,
  matchedBy: ClientInfo['matchedBy']
) {
  clientMappings.set(identifier, { serverId, simulatorUdid, matchedBy })
  debugLog(
    `Saved mapping: ${identifier} -> server=${serverId}, sim=${simulatorUdid || 'unknown'}, via=${matchedBy}`
  )
}
import type { DaemonState, ServerRegistration } from './types'
import {
  createRegistry,
  findServersByBundleId,
  findServerById,
  getAllServers,
  getRoute,
  setRoute,
  touchServer,
  pruneDeadServers,
  checkServerAlive,
  registerServer,
} from './registry'
import { createIPCServer, getSocketPath, cleanupSocket, readServerFiles } from './ipc'
import { proxyHttpRequest, proxyWebSocket } from './proxy'
import { pickServer, getBootedSimulators, resolvePendingPicker } from './picker'
import colors from 'picocolors'

const DEFAULT_PORT = 8081

interface DaemonOptions {
  port?: number
  host?: string
  quiet?: boolean
}

// allow TUI to override route mode
let routeModeOverride: 'most-recent' | 'ask' | null = null

export function setRouteMode(mode: 'most-recent' | 'ask' | null) {
  routeModeOverride = mode
}

// track which daemon state is active for marking servers
let activeDaemonState: DaemonState | null = null

// infer simulator from unmapped sims
async function inferSimulator(
  clientInfo: ClientInfo | null
): Promise<string | undefined> {
  if (clientInfo?.simulatorUdid) return clientInfo.simulatorUdid
  const simulators = await getBootedSimulators()
  const existingMappings = getSimulatorMappings()
  const unmappedSims = simulators.filter((s) => !existingMappings.has(s.udid))
  return unmappedSims[0]?.udid || simulators[0]?.udid
}

// core routing logic - returns the server to route to
async function resolveServer(
  state: DaemonState,
  headers: http.IncomingHttpHeaders,
  servers: ServerRegistration[],
  bundleId: string | null
): Promise<{ server: ServerRegistration; learned: boolean }> {
  const { info: clientInfo, identifier } = lookupClient(headers)
  debugLog(
    `resolveServer: identifier=${identifier}, clientInfo=${JSON.stringify(clientInfo)}`
  )

  // helper to learn mapping
  const learnMapping = async (
    server: ServerRegistration,
    matchedBy: ClientInfo['matchedBy']
  ) => {
    if (identifier && !clientInfo?.simulatorUdid) {
      const simUdid = await inferSimulator(clientInfo)
      if (simUdid) {
        saveClientMapping(identifier, server.id, simUdid, matchedBy)
        return true
      }
    }
    return false
  }

  // single server - always use it, but learn mapping
  if (servers.length === 1) {
    const server = servers[0]
    const learned = await learnMapping(server, 'auto')
    debugLog(`Single server: ${server.root}`)
    return { server, learned }
  }

  // PRIORITY 0: pending TUI mapping
  if (pendingMappings.size > 0 && identifier) {
    for (const [serverId, simUdid] of pendingMappings) {
      const server = findServerById(state, serverId)
      if (server && servers.some((s) => s.id === serverId)) {
        debugLog(`TUI pending mapping: ${server.root}, sim=${simUdid}`)
        saveClientMapping(identifier, serverId, simUdid, 'tui')
        pendingMappings.delete(serverId)
        return { server, learned: true }
      }
    }
  }

  // PRIORITY 1: TUI cable route (if we know the simulator)
  if (clientInfo?.simulatorUdid) {
    const simRoute = getRoute(state, `sim:${clientInfo.simulatorUdid}`)
    if (simRoute) {
      const server = findServerById(state, simRoute.serverId)
      if (server) {
        debugLog(`TUI cable route: sim=${clientInfo.simulatorUdid} -> ${server.root}`)
        return { server, learned: false }
      }
    }
  }

  // PRIORITY 2: cached client->server mapping
  if (clientInfo?.serverId) {
    const server = findServerById(state, clientInfo.serverId)
    if (server) {
      debugLog(`Cached mapping: ${identifier} -> ${server.root}`)
      return { server, learned: false }
    }
  }

  // PRIORITY 3: user-agent app name matching
  const userAgent = headers['user-agent'] || ''
  if (!isGenericExpoAgent(userAgent)) {
    const matchedServer = await matchUserAgentToServer(headers, servers)
    if (matchedServer) {
      debugLog(`UA match: ${extractAppNameFromUA(userAgent)} -> ${matchedServer.root}`)
      await learnMapping(matchedServer, 'user-agent')
      return { server: matchedServer, learned: true }
    }
  }

  // PRIORITY 4: fallback route
  const routeKey = bundleId || 'default'
  const fallbackRoute = getRoute(state, bundleId || '') || getRoute(state, 'default')
  if (fallbackRoute) {
    const server = findServerById(state, fallbackRoute.serverId)
    if (server) {
      debugLog(`Fallback route: ${server.root}`)
      await learnMapping(server, 'auto')
      return { server, learned: true }
    }
  }

  // PRIORITY 5: most recent server
  const mostRecent = [...servers].sort((a, b) => b.registeredAt - a.registeredAt)[0]
  debugLog(`Most recent fallback: ${mostRecent.root}`)
  setRoute(state, routeKey, mostRecent.id)
  await learnMapping(mostRecent, 'auto')
  return { server: mostRecent, learned: true }
}

function proxyAndTouch(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  server: ServerRegistration
) {
  // check for pending mapping - when TUI connected a sim to this server
  const pendingSimId = pendingMappings.get(server.id)
  if (pendingSimId) {
    const identifier = getPrimaryIdentifier(req.headers)
    if (identifier) {
      // KEY: learn that this client identifier belongs to this simulator AND server
      saveClientMapping(identifier, server.id, pendingSimId, 'tui')
      pendingMappings.delete(server.id)
    }
  }

  // mark this server as recently active
  if (activeDaemonState) {
    touchServer(activeDaemonState, server.id)
  }
  proxyHttpRequest(req, res, server)
}

export async function startDaemon(options: DaemonOptions = {}) {
  const port = options.port || DEFAULT_PORT
  const host = options.host || '0.0.0.0'
  const quiet = options.quiet || false

  const log = quiet ? (..._args: any[]) => {} : console.log

  const state = createRegistry()
  activeDaemonState = state

  // recover servers from disk (written by dev servers)
  const persistedServers = readServerFiles()
  for (const ps of persistedServers) {
    // verify server is actually still running
    const alive = await checkServerAlive({ port: ps.port } as ServerRegistration)
    if (alive) {
      registerServer(state, {
        port: ps.port,
        bundleId: ps.bundleId,
        root: ps.root,
      })
      log(colors.cyan(`[daemon] Recovered server: ${ps.bundleId} → :${ps.port}`))
    }
  }

  // start IPC server for CLI communication
  const ipcServer = createIPCServer(
    state,
    (id) => {
      const server = findServerById(state, id)
      if (server) {
        const shortRoot = server.root.replace(process.env.HOME || '', '~')
        log(
          colors.green(
            `[daemon] Server registered: ${server.bundleId} → :${server.port} (${shortRoot})`
          )
        )
      }
    },
    (id) => {
      log(colors.yellow(`[daemon] Server unregistered: ${id}`))
    }
  )

  // create HTTP server
  const httpServer = http.createServer(async (req, res) => {
    debugLog(`${req.method} ${req.url}`)

    // daemon management endpoints
    if (req.url?.startsWith('/__daemon')) {
      await handleDaemonEndpoint(req, res, state)
      return
    }

    // parse app from query string
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const bundleId = url.searchParams.get('app')

    // get available servers
    const servers = bundleId
      ? findServersByBundleId(state, bundleId)
      : getAllServers(state)

    if (servers.length === 0) {
      res.writeHead(404)
      res.end(bundleId ? `No server for app: ${bundleId}` : 'No servers registered')
      return
    }

    // resolve which server to use (shared logic)
    const { server } = await resolveServer(state, req.headers, servers, bundleId)

    // remember this connection for WebSocket matching
    const remotePort = req.socket?.remotePort
    if (remotePort) {
      recentConnections.set(remotePort, { serverId: server.id, timestamp: Date.now() })
      debugLog(`HTTP: port ${remotePort} -> ${server.root}`)
    }

    proxyAndTouch(req, res, server)
  })

  // handle WebSocket upgrades (HMR, etc)
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

    // try to match by recent connection from same port
    const remotePort = req.socket?.remotePort
    let server: ServerRegistration | undefined

    if (remotePort) {
      const recent = recentConnections.get(remotePort)
      if (recent && Date.now() - recent.timestamp < CONNECTION_MEMORY_MS) {
        server = findServerById(state, recent.serverId)
        if (server) {
          debugLog(`WebSocket: port ${remotePort} matched to ${server.root}`)
        }
      }
    }

    // fallback to regular resolution
    if (!server) {
      const result = await resolveServer(state, req.headers, servers, bundleId)
      server = result.server
      debugLog(`WebSocket: fallback -> ${server.root}`)
    }

    touchServer(state, server.id)
    proxyWebSocket(req, socket, head, server)
  })

  // start listening
  httpServer.listen(port, host, () => {
    log(colors.cyan('\n═══════════════════════════════════════════════════'))
    log(colors.cyan('  one daemon'))
    log(colors.cyan('═══════════════════════════════════════════════════'))
    log(
      `\n  Listening on ${colors.green(`http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)}`
    )
    log(`  IPC socket:  ${colors.dim(getSocketPath())}`)
    log('')
    log(colors.dim('  Waiting for dev servers to register...'))
    log(colors.dim("  Run 'one dev' in your project directories"))
    log('')
  })

  // start health check polling to prune dead servers
  const HEALTH_CHECK_INTERVAL = 5000 // 5 seconds
  const healthCheckInterval = setInterval(async () => {
    const prunedCount = await pruneDeadServers(state, (server) => {
      log(
        colors.yellow(
          `[daemon] Pruned dead server: ${server.bundleId} (port ${server.port})`
        )
      )
    })
    if (prunedCount > 0) {
      log(colors.dim(`[daemon] Pruned ${prunedCount} dead server(s)`))
    }
  }, HEALTH_CHECK_INTERVAL)

  // graceful shutdown
  const shutdown = () => {
    log(colors.yellow('\n[daemon] Shutting down...'))
    clearInterval(healthCheckInterval)
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
    healthCheckInterval,
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
