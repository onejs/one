// daemon types

export interface ServerRegistration {
  id: string
  port: number
  bundleId: string
  root: string
  registeredAt: number
}

export interface RouteBinding {
  // key is usually simulatorUDID or a session identifier
  key: string
  serverId: string
  createdAt: number
}

export interface DaemonState {
  servers: Map<string, ServerRegistration>
  routes: Map<string, RouteBinding>
}

// IPC message types
export type IPCMessage =
  | { type: 'register'; port: number; bundleId: string; root: string }
  | { type: 'unregister'; id: string }
  | { type: 'route'; bundleId: string; serverId: string }
  | { type: 'route-clear'; bundleId: string }
  | { type: 'status' }
  | { type: 'ping' }

export type IPCResponse =
  | { type: 'registered'; id: string }
  | { type: 'unregistered' }
  | { type: 'routed' }
  | { type: 'status'; servers: ServerRegistration[]; routes: RouteBinding[] }
  | { type: 'pong' }
  | { type: 'error'; message: string }
