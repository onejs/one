import type { MaterializedView, QueryError, QueryResultType, ViewListener } from './types'

export class NativeView<T> implements MaterializedView<T> {
  private listeners = new Set<ViewListener<T>>()
  private active = true
  private resultType: QueryResultType = 'unknown'
  private error?: QueryError

  constructor(
    public data: T,
    private release: () => void,
    private report: (error: unknown) => void
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
}
