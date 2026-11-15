import {
  DOM_PROTOCOL_VERSION,
  parseMessage,
  type DOMMessage,
  type DOMResult,
} from './protocol'
import {
  deserializeError,
  DOMBridgeError,
  serializeData,
  serializeError,
} from './serialize'
import type { DOMValue } from './types'

type Handler = (...args: DOMValue[]) => unknown
type Pending = {
  resolve: (value: DOMValue | void) => void
  reject: (reason: Error) => void
}

/** one peer and one pending map belong to exactly one host document. */
export class DOMPeer {
  private pending = new Map<string, Pending>()
  private lastReceived = 0
  private sequence = 0
  private live = true

  constructor(
    readonly epoch: string,
    private side: 'native' | 'browser',
    private send: (raw: string) => void,
    private lookup: (name: string) => Handler | undefined,
    private onMessage: (message: DOMMessage) => void,
    private onFailure: (error: unknown) => void,
    private development = false
  ) {}

  post(message: DOMMessage) {
    if (!this.live) throw new DOMBridgeError('DOM document is disposed', 'DOM_DISPOSED')
    if (message.epoch !== this.epoch) throw new DOMBridgeError('DOM epoch mismatch')
    const raw = JSON.stringify(message)
    parseMessage(raw)
    this.send(raw)
  }

  call(name: string, args: unknown[]): Promise<DOMValue | void> {
    return new Promise((resolve, reject) => {
      if (!this.live) throw new DOMBridgeError('DOM document is disposed', 'DOM_DISPOSED')
      const requestId = `${this.side}:${++this.sequence}`
      const data = serializeData(args, 'arguments') as DOMValue[]
      this.pending.set(requestId, { resolve, reject })
      try {
        this.post({
          version: DOM_PROTOCOL_VERSION,
          epoch: this.epoch,
          type: 'call',
          requestId,
          name,
          args: data,
        })
      } catch (error) {
        this.pending.delete(requestId)
        reject(error)
      }
    })
  }

  receive(raw: string) {
    if (!this.live) return
    try {
      this.receiveMessage(raw)
    } catch (error) {
      this.dispose(
        error instanceof Error ? error : new DOMBridgeError('DOM protocol failed')
      )
      throw error
    }
  }

  private receiveMessage(raw: string) {
    const message = parseMessage(raw)
    if (message.epoch !== this.epoch) return
    if (message.type === 'result') {
      const pending = this.pending.get(message.requestId)
      if (!pending) return
      this.pending.delete(message.requestId)
      const result = message.result
      if (result.status === 'error') pending.reject(deserializeError(result.error))
      else pending.resolve(result.status === 'value' ? result.value : undefined)
    } else if (message.type === 'call') {
      const otherSide = this.side === 'native' ? 'browser' : 'native'
      const sequence = Number(message.requestId.slice(otherSide.length + 1))
      if (
        message.requestId !== `${otherSide}:${sequence}` ||
        !Number.isSafeInteger(sequence) ||
        sequence <= this.lastReceived
      ) {
        throw new DOMBridgeError('Invalid or duplicate DOM request')
      }
      this.lastReceived = sequence
      void this.dispatch(message)
    } else if (message.type === 'dispose') {
      this.dispose()
      this.onMessage(message)
    } else {
      this.onMessage(message)
    }
  }

  private async dispatch(message: Extract<DOMMessage, { type: 'call' }>) {
    let result: DOMResult
    try {
      const handler = this.lookup(message.name)
      if (!handler)
        throw new DOMBridgeError(
          `DOM method ${message.name} is unavailable`,
          'DOM_METHOD_UNAVAILABLE'
        )
      const value = await handler(...message.args)
      result =
        value === undefined
          ? { status: 'void' }
          : { status: 'value', value: serializeData(value, 'result') }
    } catch (error) {
      result = { status: 'error', error: serializeError(error, this.development) }
    }
    if (!this.live) return
    try {
      this.post({
        version: DOM_PROTOCOL_VERSION,
        epoch: this.epoch,
        type: 'result',
        requestId: message.requestId,
        result,
      })
    } catch (error) {
      this.dispose()
      this.onFailure(error)
    }
  }

  dispose(
    reason: Error = new DOMBridgeError('DOM document was disposed', 'DOM_DISPOSED')
  ) {
    if (!this.live) return
    this.live = false
    for (const pending of this.pending.values()) pending.reject(reason)
    this.pending.clear()
  }
}
