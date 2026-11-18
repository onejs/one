// trailing debounce with the latest arguments; an async call still running delays the next one
export function debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<unknown> | undefined
  let pending: A | undefined
  const run = async () => {
    timer = undefined
    if (running) return
    while (pending) {
      const args = pending
      pending = undefined
      running = Promise.resolve(fn(...args))
      await running.catch(() => {})
      running = undefined
    }
  }
  return (...args: A) => {
    pending = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, wait)
  }
}
