export type SyncState =
  | { name: 'connecting' | 'connected' | 'disconnected' | 'closed' }
  | { name: 'error'; error: unknown }

export type SyncOptions = {
  pullIntervalMs?: number
  retryMinMs?: number
  retryMaxMs?: number
  onStateChange?: (state: SyncState) => void
  subscribeWake?: (request: () => void) => () => void
}

type SyncClient = {
  push(signal?: AbortSignal): Promise<void>
  pull(queries: undefined, signal?: AbortSignal): Promise<void>
}

export class NativeSync {
  private stopped = false
  private active = true
  private online = true
  private running = false
  private queued = false
  private requested = false
  private failures = 0
  private timer?: ReturnType<typeof setTimeout>
  private attempt?: AbortController
  private unsubscribeWake?: () => void
  private current: SyncState = { name: 'connecting' }
  private pullInterval: number
  private retryMin: number
  private retryMax: number

  constructor(
    private client: SyncClient,
    private options: SyncOptions,
    private report: (error: unknown) => void
  ) {
    this.pullInterval = options.pullIntervalMs ?? 300_000
    this.retryMin = options.retryMinMs ?? 1000
    this.retryMax = options.retryMaxMs ?? 30_000
    if (
      ![this.pullInterval, this.retryMin, this.retryMax].every(
        (value) => Number.isFinite(value) && value > 0
      ) ||
      this.retryMax < this.retryMin
    )
      throw new Error(
        'Native Zero sync intervals must be positive and retryMaxMs must cover retryMinMs'
      )
    this.connectWake()
    this.request()
  }

  get state(): SyncState {
    return this.current
  }

  private setState(state: SyncState) {
    if (this.current.name === state.name && state.name !== 'error') return
    this.current = state
    try {
      this.options.onStateChange?.(state)
    } catch (error) {
      this.report(error)
    }
  }

  request() {
    if (this.stopped) return
    this.requested = true
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    if (!this.active || !this.online || this.running || this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      void this.run()
    })
  }

  setActive(active: boolean) {
    if (this.stopped || this.active === active) return
    this.active = active
    this.changedAvailability()
  }

  setOnline(online: boolean) {
    if (this.stopped || this.online === online) return
    this.online = online
    this.changedAvailability()
  }

  private connectWake() {
    this.unsubscribeWake ??= this.options.subscribeWake?.(() => this.request())
  }

  private disconnectWake() {
    const unsubscribe = this.unsubscribeWake
    this.unsubscribeWake = undefined
    try {
      unsubscribe?.()
    } catch (error) {
      this.report(error)
    }
  }

  private changedAvailability() {
    if (!this.active || !this.online) {
      this.disconnectWake()
      if (this.timer !== undefined) {
        clearTimeout(this.timer)
        this.timer = undefined
      }
      this.attempt?.abort()
      this.setState({ name: 'disconnected' })
    } else {
      this.connectWake()
      this.request()
    }
  }

  private async run() {
    if (this.stopped || !this.active || !this.online || this.running) return
    this.running = true
    this.requested = false
    const attempt = new AbortController()
    this.attempt = attempt
    if (this.current.name !== 'connected') this.setState({ name: 'connecting' })
    let failed = false
    try {
      let pushFailed = false
      let pushError: unknown
      try {
        await this.client.push(attempt.signal)
      } catch (error) {
        if (attempt.signal.aborted) throw error
        pushFailed = true
        pushError = error
      }
      await this.client.pull(undefined, attempt.signal)
      if (pushFailed) throw pushError
      if (!attempt.signal.aborted && !this.stopped) {
        this.failures = 0
        this.setState({ name: 'connected' })
      }
    } catch (error) {
      if (!attempt.signal.aborted && !this.stopped) {
        failed = true
        this.failures++
        this.setState({ name: 'error', error })
        this.report(error)
      }
    } finally {
      this.running = false
      this.attempt = undefined
      if (!this.stopped && this.active && this.online) {
        if (this.requested && !failed) this.request()
        else {
          const delay = failed
            ? Math.min(
                this.retryMax,
                this.retryMin * 2 ** Math.min(this.failures - 1, 30)
              )
            : this.pullInterval
          this.timer = setTimeout(() => this.request(), delay)
        }
      }
    }
  }

  stop() {
    if (this.stopped) return
    this.stopped = true
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.attempt?.abort()
    this.disconnectWake()
    this.setState({ name: 'closed' })
  }
}
