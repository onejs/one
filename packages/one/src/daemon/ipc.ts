// IPC socket for daemon communication

import * as net from 'node:net'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { IPCMessage, IPCResponse, DaemonState } from './types'
import {
  registerServer,
  unregisterServer,
  getAllServers,
  getAllRoutes,
  setRoute,
  clearRoute,
  findServerById,
  touchServer,
  getLastActiveServer,
} from './registry'

const SOCKET_DIR = path.join(os.homedir(), '.one')
const SOCKET_PATH = path.join(SOCKET_DIR, 'daemon.sock')
const SERVERS_FILE = path.join(SOCKET_DIR, 'servers.json')

export function getSocketPath(): string {
  return SOCKET_PATH
}

export function getServersFilePath(): string {
  return SERVERS_FILE
}

export function ensureSocketDir(): void {
  if (!fs.existsSync(SOCKET_DIR)) {
    fs.mkdirSync(SOCKET_DIR, { recursive: true })
  }
}

// persist server info to disk so daemon can recover on restart
interface PersistedServer {
  port: number
  bundleId: string
  root: string
  pid: number
}

export function writeServerFile(server: PersistedServer): void {
  ensureSocketDir()
  const servers = readServerFiles()
  // remove any existing entry for this root
  const filtered = servers.filter((s) => s.root !== server.root)
  filtered.push(server)
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(filtered, null, 2))
}

export function removeServerFile(root: string): void {
  const servers = readServerFiles()
  const filtered = servers.filter((s) => s.root !== root)
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(filtered, null, 2))
}

export function readServerFiles(): PersistedServer[] {
  try {
    if (fs.existsSync(SERVERS_FILE)) {
      return JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf-8'))
    }
  } catch {
    // ignore parse errors
  }
  return []
}

export function cleanupSocket(): void {
  try {
    if (fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH)
    }
  } catch {
    // ignore
  }
}

export function createIPCServer(
  state: DaemonState,
  onServerRegistered?: (id: string) => void,
  onServerUnregistered?: (id: string) => void
): net.Server {
  ensureSocketDir()
  cleanupSocket()

  const server = net.createServer((socket) => {
    let buffer = ''

    socket.on('data', (data) => {
      buffer += data.toString()

      // handle newline-delimited JSON messages
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const message: IPCMessage = JSON.parse(line)
          const response = handleMessage(
            state,
            message,
            onServerRegistered,
            onServerUnregistered
          )
          socket.write(JSON.stringify(response) + '\n')
        } catch (err) {
          const errResponse: IPCResponse = {
            type: 'error',
            message: err instanceof Error ? err.message : 'Unknown error',
          }
          socket.write(JSON.stringify(errResponse) + '\n')
        }
      }
    })

    socket.on('error', (err) => {
      console.error('[daemon] IPC socket error:', err.message)
    })
  })

  server.listen(SOCKET_PATH, () => {
    // owner-only permissions for security
    fs.chmodSync(SOCKET_PATH, 0o600)
  })

  return server
}

function handleMessage(
  state: DaemonState,
  message: IPCMessage,
  onServerRegistered?: (id: string) => void,
  onServerUnregistered?: (id: string) => void
): IPCResponse {
  switch (message.type) {
    case 'register': {
      const registration = registerServer(state, {
        port: message.port,
        bundleId: message.bundleId,
        root: message.root,
      })
      onServerRegistered?.(registration.id)
      return { type: 'registered', id: registration.id }
    }

    case 'unregister': {
      unregisterServer(state, message.id)
      onServerUnregistered?.(message.id)
      return { type: 'unregistered' }
    }

    case 'route': {
      const server = findServerById(state, message.serverId)
      if (!server) {
        return { type: 'error', message: `Server not found: ${message.serverId}` }
      }
      // use bundleId as route key for now
      setRoute(state, message.bundleId, message.serverId)
      return { type: 'routed' }
    }

    case 'route-clear': {
      clearRoute(state, message.bundleId)
      return { type: 'routed' }
    }

    case 'status': {
      return {
        type: 'status',
        servers: getAllServers(state),
        routes: getAllRoutes(state),
      }
    }

    case 'ping': {
      return { type: 'pong' }
    }

    case 'touch': {
      const touched = touchServer(state, message.id)
      if (!touched) {
        return { type: 'error', message: `Server not found: ${message.id}` }
      }
      return { type: 'touched' }
    }

    case 'get-last-active': {
      const server = getLastActiveServer(state)
      return { type: 'last-active', server }
    }

    default: {
      return { type: 'error', message: `Unknown message type` }
    }
  }
}

// client functions for connecting to daemon

export async function isDaemonRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!fs.existsSync(SOCKET_PATH)) {
      resolve(false)
      return
    }

    const client = net.connect(SOCKET_PATH)
    const timeout = setTimeout(() => {
      client.destroy()
      resolve(false)
    }, 1000)

    client.on('connect', () => {
      clearTimeout(timeout)
      client.write(JSON.stringify({ type: 'ping' }) + '\n')
    })

    client.on('data', (data) => {
      clearTimeout(timeout)
      try {
        const response = JSON.parse(data.toString().trim())
        resolve(response.type === 'pong')
      } catch {
        resolve(false)
      }
      client.destroy()
    })

    client.on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    })
  })
}

export async function sendIPCMessage(message: IPCMessage): Promise<IPCResponse> {
  return new Promise((resolve, reject) => {
    const client = net.connect(SOCKET_PATH)
    let buffer = ''

    const timeout = setTimeout(() => {
      client.destroy()
      reject(new Error('IPC timeout'))
    }, 5000)

    client.on('connect', () => {
      client.write(JSON.stringify(message) + '\n')
    })

    client.on('data', (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      // keep the last incomplete line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          clearTimeout(timeout)
          const response = JSON.parse(line)
          client.destroy()
          resolve(response)
          return
        } catch {
          // malformed message, continue to next line
        }
      }
    })

    client.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

export async function registerWithDaemon(opts: {
  port: number
  bundleId: string
  root: string
}): Promise<string> {
  const response = await sendIPCMessage({
    type: 'register',
    ...opts,
  })

  if (response.type === 'registered') {
    return response.id
  }

  if (response.type === 'error') {
    throw new Error(response.message)
  }

  throw new Error('Unexpected response from daemon')
}

export async function unregisterFromDaemon(id: string): Promise<void> {
  await sendIPCMessage({ type: 'unregister', id })
}

export async function getDaemonStatus(): Promise<{
  servers: { id: string; port: number; bundleId: string; root: string }[]
  routes: { key: string; serverId: string }[]
}> {
  const response = await sendIPCMessage({ type: 'status' })

  if (response.type === 'status') {
    return {
      servers: response.servers,
      routes: response.routes,
    }
  }

  throw new Error('Failed to get daemon status')
}

export async function setDaemonRoute(bundleId: string, serverId: string): Promise<void> {
  const response = await sendIPCMessage({
    type: 'route',
    bundleId,
    serverId,
  })

  if (response.type === 'error') {
    throw new Error(response.message)
  }
}

export async function clearDaemonRoute(bundleId: string): Promise<void> {
  await sendIPCMessage({ type: 'route-clear', bundleId })
}

export async function touchDaemonServer(id: string): Promise<void> {
  const response = await sendIPCMessage({ type: 'touch', id })
  if (response.type === 'error') {
    throw new Error(response.message)
  }
}

export async function getLastActiveDaemonServer(): Promise<{
  id: string
  port: number
  bundleId: string
  root: string
} | null> {
  const response = await sendIPCMessage({ type: 'get-last-active' })
  if (response.type === 'last-active') {
    return response.server
  }
  throw new Error('Failed to get last active server')
}
