// server registry for daemon

import * as net from 'node:net'
import type { ServerRegistration, RouteBinding, DaemonState } from './types'

let idCounter = 0

export function createRegistry(): DaemonState {
  return {
    servers: new Map(),
    routes: new Map(),
  }
}

// check if a server is still listening on its port
export function checkServerAlive(server: ServerRegistration): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 1000)

    socket.on('connect', () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve(true)
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve(false)
    })

    socket.connect(server.port, '127.0.0.1')
  })
}

// prune dead servers from the registry
export async function pruneDeadServers(
  state: DaemonState,
  onPruned?: (server: ServerRegistration) => void
): Promise<number> {
  const servers = getAllServers(state)
  let prunedCount = 0

  for (const server of servers) {
    const alive = await checkServerAlive(server)
    if (!alive) {
      unregisterServer(state, server.id)
      onPruned?.(server)
      prunedCount++
    }
  }

  return prunedCount
}

export function registerServer(
  state: DaemonState,
  opts: { port: number; bundleId: string; root: string }
): ServerRegistration {
  const id = `server-${++idCounter}`
  const registration: ServerRegistration = {
    id,
    port: opts.port,
    bundleId: opts.bundleId,
    root: opts.root,
    registeredAt: Date.now(),
  }
  state.servers.set(id, registration)
  return registration
}

export function unregisterServer(state: DaemonState, id: string): boolean {
  const deleted = state.servers.delete(id)
  // also remove any routes pointing to this server
  for (const [key, route] of state.routes) {
    if (route.serverId === id) {
      state.routes.delete(key)
    }
  }
  return deleted
}

export function findServersByBundleId(
  state: DaemonState,
  bundleId: string
): ServerRegistration[] {
  const matches: ServerRegistration[] = []
  for (const server of state.servers.values()) {
    if (server.bundleId === bundleId) {
      matches.push(server)
    }
  }
  return matches
}

export function findServerById(
  state: DaemonState,
  id: string
): ServerRegistration | undefined {
  return state.servers.get(id)
}

export function setRoute(
  state: DaemonState,
  key: string,
  serverId: string
): RouteBinding {
  const binding: RouteBinding = {
    key,
    serverId,
    createdAt: Date.now(),
  }
  state.routes.set(key, binding)
  return binding
}

export function getRoute(state: DaemonState, key: string): RouteBinding | undefined {
  return state.routes.get(key)
}

export function clearRoute(state: DaemonState, key: string): boolean {
  return state.routes.delete(key)
}

export function getAllServers(state: DaemonState): ServerRegistration[] {
  return Array.from(state.servers.values())
}

export function getAllRoutes(state: DaemonState): RouteBinding[] {
  return Array.from(state.routes.values())
}

export function touchServer(state: DaemonState, id: string): boolean {
  const server = state.servers.get(id)
  if (server) {
    server.lastActiveAt = Date.now()
    return true
  }
  return false
}

export function getLastActiveServer(state: DaemonState): ServerRegistration | null {
  let lastActive: ServerRegistration | null = null
  let maxTime = 0

  for (const server of state.servers.values()) {
    const activeTime = server.lastActiveAt || server.registeredAt
    if (activeTime > maxTime) {
      maxTime = activeTime
      lastActive = server
    }
  }

  return lastActive
}
