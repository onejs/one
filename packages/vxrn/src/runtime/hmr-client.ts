/**
 * HMR client for React Native.
 * Ported from rollipop (https://github.com/leegeunhyeok/rollipop)
 *
 * connects to dev server WebSocket, handles HMR messages,
 * and integrates with React Native's DevLoadingView and LogBox.
 */

import type { HMRClientLogLevel, HMRClientMessage, HMRServerMessage } from './hmr-types'

declare var __DEV__: boolean

interface HMRClientNativeInterface {
  enable(): void
  disable(): void
  registerBundle(requestUrl: string): void
  log(level: string, data: any[]): void
  setup(
    platform: string,
    bundleEntry: string,
    host: string,
    port: number | string,
    isEnabled: boolean,
    scheme?: string
  ): void
}

interface SocketInstance {
  socket: WebSocket
  origin: string
}

class HMRClient implements HMRClientNativeInterface {
  static readonly STARTUP_ERROR = 'Expected HMRClient.setup() call at startup'
  static readonly MAX_PENDING_LOGS = 100

  private enabled = true
  private _socketHolder: SocketInstance | null = null
  private unavailableMessage: string | null = null
  private compileErrorMessage: string | null = null
  private pendingUpdatesCount = 0
  private readonly pendingLogs: [HMRClientLogLevel, any[]][] = []

  enable() {
    if (this.unavailableMessage) throw new Error(this.unavailableMessage)
    if (this._socketHolder == null) throw new Error(HMRClient.STARTUP_ERROR)
    this.enabled = true
    this.showCompileErrorIfNeeded()
  }

  disable() {
    this.enabled = false
  }

  registerBundle(_requestUrl: string) {
    // no-op for rolldown HMR
  }

  log(level: HMRClientLogLevel, data: any[]) {
    if (this._socketHolder == null) {
      this.pendingLogs.push([level, data])
      if (this.pendingLogs.length > HMRClient.MAX_PENDING_LOGS) {
        this.pendingLogs.shift()
      }
      return
    }

    try {
      const stringData = data.map((item) =>
        typeof item === 'string' ? item : JSON.stringify(item, null, 2)
      )
      this.send({ type: 'hmr:log', level, data: stringData })
    } catch {}
  }

  setup(
    platform: string,
    bundleEntry: string,
    host: string,
    port: number | string,
    isEnabled = true,
    protocol = 'http'
  ) {
    if (!__DEV__) throw new Error('HMR is only available in development mode')
    if (this._socketHolder != null)
      throw new Error('Cannot initialize HMRClient more than once')
    if (platform == null) throw new Error('Missing required parameter `platform`')
    if (bundleEntry == null) throw new Error('Missing required parameter `bundleEntry`')
    if (host == null) throw new Error('Missing required parameter `host`')

    const serverHost = port !== null && port !== '' ? `${host}:${port}` : host
    const origin = `${protocol}://${serverHost}`
    const socket = new globalThis.WebSocket(`${origin}/hot`)

    this._socketHolder = { socket, origin }

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'hmr:connected',
          bundleEntry,
          platform,
        } satisfies HMRClientMessage)
      )
      this.handleConnection()
    })

    socket.addEventListener('error', (event) => {
      this.handleConnectionError(
        (event as any).error || new Error('WebSocket error'),
        origin
      )
    })

    socket.addEventListener('message', (event) => {
      this.handleMessage(event)
    })

    socket.addEventListener('close', (event) => {
      this.handleClose(event)
    })

    // connect to rolldown runtime
    if (globalThis.__rolldown_runtime__ != null) {
      globalThis.__rolldown_runtime__.setup(socket, origin)
    }

    this.enabled = isEnabled
  }

  private send(payload: HMRClientMessage) {
    if (this._socketHolder == null) return
    if (this._socketHolder.socket.readyState === WebSocket.OPEN) {
      this._socketHolder.socket.send(JSON.stringify(payload))
    }
  }

  private flushEarlyLogs() {
    if (
      this._socketHolder == null ||
      this._socketHolder.socket.readyState !== WebSocket.OPEN
    ) {
      return
    }
    for (const [level, data] of this.pendingLogs) {
      this.send({ type: 'hmr:log', level, data })
    }
    this.pendingLogs.length = 0
  }

  private showCompileErrorIfNeeded() {
    if (this.compileErrorMessage == null) return
    const error = new Error(this.compileErrorMessage)
    this.compileErrorMessage = null
    Object.defineProperty(error, 'preventSymbolication', { value: true })
    throw error
  }

  private handleConnection() {
    this.flushEarlyLogs()
  }

  private handleConnectionError(error: Error, origin: string) {
    let msg =
      'Cannot connect to One dev server.\n\n' +
      'Try the following:\n' +
      '- Ensure the dev server is running and on the same network\n'

    msg += `\nURL: ${origin}\nError: ${error.message}`

    this.unavailableMessage ??= msg
    this.showCompileErrorIfNeeded()
  }

  private handleMessage(message: MessageEvent) {
    const data = JSON.parse(String(message.data)) as HMRServerMessage

    if (!this.enabled && data.type.startsWith('hmr:')) return

    switch (data.type) {
      case 'hmr:update-start':
        this.pendingUpdatesCount++
        this.compileErrorMessage = null
        break

      case 'hmr:update':
        break

      case 'hmr:update-done':
        this.pendingUpdatesCount = Math.max(0, this.pendingUpdatesCount - 1)
        break

      case 'hmr:error':
        this.compileErrorMessage = data.payload.message
        this.showCompileErrorIfNeeded()
        break
    }
  }

  private handleClose(event: CloseEvent) {
    const { code, reason } = event
    const isNormalClose = code === 1000 || code === 1005
    const message = isNormalClose
      ? 'Disconnected from dev server.'
      : `Disconnected from dev server (${code}: "${reason}").`

    this.unavailableMessage ??= message + '\n\nReload the app to reconnect.\n'
  }
}

const instance = new HMRClient()

export default Object.defineProperty(instance, 'default', {
  get: () => instance,
})
