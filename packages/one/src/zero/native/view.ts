import type {
  MaterializedView,
  QueryError,
  QueryResultType,
  TTL,
  ViewListener,
} from './types'

export function queryTTL(ttl: TTL = 300_000): number {
  if (ttl === 'none') return 0
  if (ttl === 'forever') return 600_000
  let duration: number
  if (typeof ttl === 'number') duration = ttl
  else {
    const multiplier = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      y: 31_536_000_000,
    }[ttl.at(-1)!]
    if (multiplier === undefined) throw new Error('Invalid Native Zero query TTL')
    duration = Number(ttl.slice(0, -1)) * multiplier
    if (Number.isNaN(duration)) throw new Error('Invalid Native Zero query TTL')
  }
  if (Number.isNaN(duration)) return 0
  return !Number.isFinite(duration) || duration < 0
    ? 600_000
    : Math.min(duration, 600_000)
}

export class NativeView<T> implements MaterializedView<T> {
  private listeners = new Set<ViewListener<T>>()
  private active = true
  private resultType: QueryResultType = 'unknown'
  private error?: QueryError

  constructor(
    public data: T,
    private release: () => void,
    private report: (error: unknown) => void,
    private setTTL: (ttl: TTL) => void
  ) {}

  addListener(listener: ViewListener<T>): () => void {
    if (!this.active) throw new Error('Native Zero view is destroyed')
    this.listeners.add(listener)
    listener(this.data, this.resultType, this.error)
    return () => {
      this.listeners.delete(listener)
    }
  }

  update(data: T, resultType: QueryResultType, error?: QueryError) {
    if (!this.active) return
    this.data = data
    this.resultType = resultType
    this.error = error
    for (const listener of [...this.listeners]) {
      if (this.active && this.listeners.has(listener)) {
        try {
          listener(data, resultType, error)
        } catch (cause) {
          this.report(cause)
        }
      }
    }
  }

  destroy() {
    if (!this.active) return
    this.active = false
    this.listeners.clear()
    this.release()
  }

  updateTTL(ttl: TTL) {
    if (!this.active) throw new Error('Native Zero view is destroyed')
    this.setTTL(ttl)
  }
}
