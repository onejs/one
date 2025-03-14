import { useLayoutEffect, useState } from 'react'

export class Emitter<const T> {
  private disposables = new Set<(cb: any) => void>()

  constructor(public value?: T) {}

  listen = (disposable: (cb: T) => void) => {
    this.disposables.add(disposable)
    return () => {
      this.disposables.delete(disposable)
    }
  }

  emit = (next: T) => {
    this.value = next
    this.disposables.forEach((cb) => cb(next))
  }

  use = (cb: (cb: T) => void, args?: any[]) => {
    useLayoutEffect(() => {
      return this.listen(cb)
    }, args ?? [])
  }

  useValue = () => {
    const [state, setState] = useState<T | undefined>(this.value)
    this.use(setState)
    return state
  }

  nextValue = (): Promise<T> => {
    return new Promise<T>((res) => {
      const dispose = this.listen((val) => {
        dispose()
        res(val)
      })
    })
  }
}

export function createEmitter<T>(defaultValue?: T) {
  return new Emitter<T>(defaultValue)
}
