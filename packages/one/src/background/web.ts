import type {
  BackgroundExecutor,
  BackgroundResponse,
  BackgroundResult,
} from './backgroundContract'

export function createWorkerExecutor<Input, Output>(
  createWorker: () => Worker
): BackgroundExecutor<Input, Output> & { readonly failed: boolean } {
  const worker = createWorker()
  let disposed = false
  let failure: Error | null = null
  const pending = new Map<
    number,
    {
      resolve: (result: BackgroundResult<Output>) => void
      reject: (error: Error) => void
    }
  >()

  function fail(error: Error) {
    if (disposed || failure) return
    failure = error
    worker.terminate()
    for (const rejected of pending.values()) rejected.reject(error)
    pending.clear()
  }

  worker.onmessage = (event: MessageEvent<BackgroundResponse<Output>>) => {
    const response = event.data
    const revision = response.ok ? response.result.revision : response.revision
    const accepted = pending.get(revision)
    if (!accepted) return
    pending.delete(revision)
    if (response.ok) accepted.resolve(response.result)
    else accepted.reject(new Error(response.error))
  }
  worker.onerror = (event) => {
    event.preventDefault()
    fail(new Error(event.message))
  }
  worker.onmessageerror = () =>
    fail(new Error('background worker response could not be decoded'))

  return {
    get failed() {
      return failure !== null
    },
    execute(request, isCurrent) {
      if (disposed || !isCurrent(request.revision)) return Promise.resolve(null)
      if (failure) return Promise.reject(failure)
      if (pending.has(request.revision))
        throw new Error('background revision is already pending')
      return new Promise<BackgroundResult<Output>>((resolve, reject) => {
        pending.set(request.revision, { resolve, reject })
        try {
          worker.postMessage(request)
        } catch (error) {
          pending.delete(request.revision)
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (!failure) worker.terminate()
      for (const rejected of pending.values())
        rejected.reject(new Error('background computation disposed'))
      pending.clear()
    },
  }
}
