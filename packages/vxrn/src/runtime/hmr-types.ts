export interface HMRContext {
  accept(...args: any[]): void
  invalidate(): void
  on(event: string, listener: (...args: any[]) => void): void
  off(event: string, listener: (...args: any[]) => void): void
  send(type: string, payload?: unknown): void
}

export type HMRClientLogLevel =
  | 'trace'
  | 'info'
  | 'warn'
  | 'error'
  | 'log'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'debug'

export type HMRClientMessage =
  | { type: 'hmr:connected'; bundleEntry: string; platform: string }
  | { type: 'hmr:module-registered'; modules: string[] }
  | { type: 'hmr:log'; level: HMRClientLogLevel; data: any[] }
  | { type: 'hmr:invalidate'; moduleId: string }

export type HMRServerMessage =
  | { type: 'hmr:update-start' }
  | { type: 'hmr:update-done' }
  | { type: 'hmr:update'; code: string }
  | { type: 'hmr:reload' }
  | { type: 'hmr:error'; payload: HMRServerError }

export type HMRCustomMessage = {
  type: string
  payload: unknown
}

export type HMRCustomHandler = (socket: WebSocket, message: HMRCustomMessage) => void

export interface HMRServerError {
  type: string
  message: string
  errors: { description: string }[]
}

export interface DevRuntimeModule {
  exportsHolder: { exports: any }
  id: string
  exports: any
}

export interface DevRuntimeInterface {
  modules: Record<string, DevRuntimeModule>
  createModuleHotContext(moduleId: string): void
  applyUpdates(boundaries: [string, string][]): void
  registerModule(id: string, exportsHolder: DevRuntimeModule['exportsHolder']): void
  loadExports(id: string): DevRuntimeModule['exports']
}

declare global {
  var __VXRN_ON_MODULE_UPDATED__: ((moduleId: string) => void) | undefined
}

// the base class is provided by rolldown's devMode runtime
// DO NOT rename - rolldown references this by name
class DevRuntime implements DevRuntimeInterface {
  clientId!: string
  constructor(messenger: DevRuntimeMessenger, clientId: string) {}
  modules: Record<string, DevRuntimeModule> = {}
  createModuleHotContext(moduleId: string): void {
    throw new Error('createModuleHotContext should be implemented')
  }
  applyUpdates(boundaries: [string, string][]): void {
    throw new Error('applyUpdates should be implemented')
  }
  registerModule(id: string, exportsHolder: DevRuntimeModule['exportsHolder']): void {
    throw new Error('registerModule should be implemented')
  }
  loadExports(id: string): DevRuntimeModule['exports'] {
    throw new Error('loadExports should be implemented')
  }
}

export type { DevRuntime }

export interface DevRuntimeMessenger {
  send(message: HMRClientMessage): void
}
