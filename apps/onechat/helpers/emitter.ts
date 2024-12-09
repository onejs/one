import { useEffect } from 'react'

export class Emitter<T> {
  private disposables = new Set<(cb: any) => void>()

  listen(disposable: (cb: T) => void) {
    this.disposables.add(disposable)
    return () => {
      this.disposables.delete(disposable)
    }
  }

  trigger<T>(next: T) {
    this.disposables.forEach((cb) => cb(next))
  }
}

export function createEmitter<T>() {
  const listenable = new Emitter<T>()

  const useListener = (cb: (cb: T) => void) => {
    useEffect(() => {
      return listenable.listen(cb)
    }, [])
  }

  return [listenable, useListener] as const
}
