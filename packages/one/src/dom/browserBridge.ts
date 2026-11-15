import { DOMPeer } from './peer'
import { DOM_PROTOCOL_VERSION, parseBootstrap, type DOMMessage } from './protocol'
import { DOMBridgeError, serializeError, type DOMState } from './serialize'
import type { DOMImperativeHandle } from './types'

/** native installs this shim before application script and queues transport writes until ready. */
export type DOMTransport = {
  bootstrap: unknown
  postMessage: (raw: string) => void
  subscribe: (listener: (raw: string) => void) => () => void
}

export class DOMBrowserBridge {
  readonly bootstrap: ReturnType<typeof parseBootstrap>
  private peer: DOMPeer
  private current: DOMState
  private callbacks = new Map<string, (...args: unknown[]) => Promise<unknown>>()
  private methods: DOMImperativeHandle = Object.create(null)
  private unsubscribe?: () => void
  private live = true
  private started = false
  private handleRegistered = false

  constructor(
    entryId: string,
    private transport: DOMTransport,
    private render: (props: Record<string, unknown>) => void,
    private onDispose: () => void,
    private onFailure: (error: unknown) => void,
    private development = false
  ) {
    this.bootstrap = parseBootstrap(transport.bootstrap, entryId)
    this.current = this.bootstrap
    this.peer = new DOMPeer(
      this.bootstrap.epoch,
      'browser',
      (raw) => transport.postMessage(raw),
      (name) => {
        return Object.hasOwn(this.methods, name) ? this.methods[name] : undefined
      },
      (message) => this.receiveControl(message),
      onFailure,
      development
    )
  }

  start() {
    if (this.started || !this.live)
      throw new DOMBridgeError('DOM browser mount already started or disposed')
    this.started = true
    this.unsubscribe = this.transport.subscribe((raw) => {
      try {
        this.peer.receive(raw)
      } catch (error) {
        try {
          this.onFailure(error)
        } finally {
          this.dispose()
        }
      }
    })
    this.render(this.props())
    this.post({ type: 'ready', revision: this.current.revision })
  }

  private props(): Record<string, unknown> {
    const props = { ...this.current.props }
    const available = new Set(this.current.actions)
    for (const name of this.callbacks.keys()) {
      if (!available.has(name)) this.callbacks.delete(name)
    }
    for (const name of available) {
      let callback = this.callbacks.get(name)
      if (!callback) {
        callback = (...args) => {
          if (!this.current.actions.includes(name)) {
            return Promise.reject(
              new DOMBridgeError(
                `DOM action ${name} was removed`,
                'DOM_METHOD_UNAVAILABLE'
              )
            )
          }
          return this.peer.call(name, args)
        }
        this.callbacks.set(name, callback)
      }
      Object.defineProperty(props, name, {
        value: callback,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
    return props
  }

  private receiveControl(message: DOMMessage) {
    if (message.type === 'state') {
      if (message.revision <= this.current.revision) return
      this.current = message
      this.render(this.props())
    } else if (message.type === 'dispose') {
      this.dispose(false)
    } else {
      throw new DOMBridgeError('Unexpected native DOM message')
    }
  }

  private post(
    message:
      | { type: 'ready'; revision: number }
      | { type: 'handle'; methods: string[] }
      | { type: 'size'; width: number; height: number }
      | { type: 'dispose' }
  ) {
    this.peer.post({
      version: DOM_PROTOCOL_VERSION,
      epoch: this.bootstrap.epoch,
      ...message,
    })
  }

  setHandle(methods: DOMImperativeHandle): () => void {
    if (!this.live) throw new DOMBridgeError('DOM document is disposed', 'DOM_DISPOSED')
    if (this.handleRegistered)
      throw new DOMBridgeError(
        'Only one DOM imperative handle is supported per component'
      )
    if (Object.hasOwn(methods, 'then'))
      throw new DOMBridgeError('Imperative method name "then" is reserved')
    this.methods = methods
    this.handleRegistered = true
    this.post({ type: 'handle', methods: Object.keys(methods).sort() })
    return () => {
      if (this.methods !== methods) return
      this.methods = Object.create(null)
      this.handleRegistered = false
      if (this.live) this.post({ type: 'handle', methods: [] })
    }
  }

  measure(width: number, height: number) {
    if (this.live) this.post({ type: 'size', width, height })
  }

  reportError(error: unknown) {
    if (this.live)
      this.transport.postMessage(
        JSON.stringify({
          version: DOM_PROTOCOL_VERSION,
          epoch: this.bootstrap.epoch,
          type: 'error',
          error: serializeError(error, this.development),
        })
      )
  }

  dispose(notify = true) {
    if (!this.live) return
    this.live = false
    this.peer.dispose()
    this.unsubscribe?.()
    this.unsubscribe = undefined
    this.methods = Object.create(null)
    this.callbacks.clear()
    try {
      if (notify) {
        try {
          this.transport.postMessage(
            JSON.stringify({
              version: DOM_PROTOCOL_VERSION,
              epoch: this.bootstrap.epoch,
              type: 'dispose',
            })
          )
        } catch (error) {
          this.onFailure(error)
        }
      }
    } finally {
      this.onDispose()
    }
  }
}
