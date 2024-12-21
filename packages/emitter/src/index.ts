import { useEffect } from 'react'

export class Emitter<const T> {
  private disposables = new Set<(cb: any) => void>()

  listen = (disposable: (cb: T) => void) => {
    this.disposables.add(disposable)
    return () => {
      this.disposables.delete(disposable)
    }
  }

  emit = (next: T) => {
    this.disposables.forEach((cb) => cb(next))
  }

  use = (cb: (cb: T) => void, args?: any[]) => {
    useEffect(() => {
      return this.listen(cb)
    }, args ?? [])
  }
}

export function createEmitter<T>() {
  return new Emitter<T>()
}
