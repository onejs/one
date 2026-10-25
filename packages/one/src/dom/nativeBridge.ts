import { DOMPeer } from './peer'
import { DOM_PROTOCOL_VERSION, type DOMMessage } from './protocol'
import { DOMBridgeError, type DOMState, serializeProps } from './serialize'

type Prepared = ReturnType<typeof serializeProps> & { state: DOMState }

/** React commits state here; rendering a speculative update never replaces handlers. */
export class DOMNativeBridge {
  private sequence = 0
  private committed: Prepared
  private peer?: DOMPeer
  private epoch?: string
  private ready = false
  private sentRevision = -1
  private epochs = new Set<string>()

  constructor(
    initial: ReturnType<typeof serializeProps>,
    private send: (raw: string) => void,
    private notify: (message: DOMMessage | { type: 'document'; epoch?: string }) => void,
    private onFailure: (error: unknown) => void,
    private development = false
  ) {
    this.committed = {
      ...initial,
      actions: new Map(),
      state: { revision: 0, props: initial.props, actions: [...initial.actions.keys()] },
    }
  }

  prepare(serialized: ReturnType<typeof serializeProps>): Prepared {
    const state =
      serialized.key === this.committed.key
        ? this.committed.state
        : {
            revision: ++this.sequence,
            props: serialized.props,
            actions: [...serialized.actions.keys()],
          }
    return { ...serialized, state }
  }

  commit(prepared: Prepared) {
    this.committed = prepared
    this.reconcile()
  }

  startDocument(epoch: string, revision: number) {
    if (
      !epoch ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      revision > this.committed.state.revision
    ) {
      throw new DOMBridgeError('Invalid native document snapshot')
    }
    if (this.epochs.has(epoch))
      throw new DOMBridgeError('A new document must have a fresh epoch')
    this.epochs.add(epoch)
    this.dispose()
    this.epoch = epoch
    this.sentRevision = revision
    this.peer = new DOMPeer(
      epoch,
      'native',
      this.send,
      (name) => {
        if (!this.ready)
          throw new DOMBridgeError('DOM document is not ready', 'DOM_NOT_READY')
        return this.committed.actions.get(name)
      },
      (message) => {
        if (message.type === 'dispose') {
          this.dispose()
          return
        } else if (message.type === 'ready') {
          if (this.ready || message.revision !== revision)
            throw new DOMBridgeError('Invalid DOM ready revision')
          this.ready = true
          this.reconcile()
        } else if (
          (!this.ready && message.type !== 'error') ||
          message.type === 'state'
        ) {
          throw new DOMBridgeError('Unexpected browser DOM message')
        }
        this.notify(message)
      },
      this.onFailure,
      this.development
    )
    this.notify({ type: 'document', epoch })
  }

  private reconcile() {
    if (this.ready && this.peer && this.committed.state.revision > this.sentRevision) {
      this.peer.post({
        version: DOM_PROTOCOL_VERSION,
        epoch: this.epoch!,
        type: 'state',
        ...this.committed.state,
      })
      this.sentRevision = this.committed.state.revision
    }
  }

  receive(raw: string) {
    try {
      this.peer?.receive(raw)
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  createHandle(
    methods: string[]
  ): Record<string, (...args: unknown[]) => Promise<unknown>> {
    const peer = this.peer
    const handle: Record<string, (...args: unknown[]) => Promise<unknown>> =
      Object.create(null)
    for (const method of methods) {
      if (method === 'then')
        throw new DOMBridgeError('Imperative method name "then" is reserved')
      handle[method] = (...args) =>
        peer && this.ready
          ? peer.call(method, args)
          : Promise.reject(
              new DOMBridgeError('DOM document is not ready', 'DOM_NOT_READY')
            )
    }
    return Object.freeze(handle)
  }

  dispose() {
    this.peer?.dispose()
    this.peer = undefined
    this.epoch = undefined
    this.ready = false
    this.sentRevision = -1
    this.notify({ type: 'document' })
  }
}
