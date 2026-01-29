/**
 * Simple concurrency limiter for parallel async operations.
 * Returns a function that wraps promises to limit concurrent execution.
 *
 * @param concurrency - Maximum number of concurrent operations
 * @returns A function that takes a promise-returning function and queues it
 *
 * @example
 * const limit = pLimit(4)
 * const results = await Promise.all(
 *   urls.map(url => limit(() => fetch(url)))
 * )
 */
export function pLimit(concurrency: number) {
  const queue: (() => void)[] = []
  let active = 0

  const next = () => {
    if (active < concurrency && queue.length > 0) {
      active++
      const fn = queue.shift()!
      fn()
    }
  }

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--
            next()
          })
      })
      next()
    })
  }
}
