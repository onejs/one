export class Listeners<T> {
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
