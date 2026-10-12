import type {
  BackgroundExecutor,
  BackgroundResponse,
  BackgroundResult,
} from './backgroundContract'

export function createWorkerExecutor<Input, Output>(
  createWorker: () => Worker
): BackgroundExecutor<Input, Output> {
  const worker = createWorker()
  let disposed = false
  let failure: Error | null = null
  let pending: {
    revision: number
    resolve: (result: BackgroundResult<Output>) => void
    reject: (error: Error) => void
  } | null = null

  function fail(error: Error) {
    if (disposed || failure) return
    failure = error
    worker.terminate()
    const rejected = pending
    pending = null
    rejected?.reject(error)
  }

  worker.onmessage = (event: MessageEvent<BackgroundResponse<Output>>) => {
    const response = event.data
    const revision = response.ok ? response.result.revision : response.revision
    if (!pending || revision !== pending.revision) return
    const accepted = pending
    pending = null
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
    execute(request, isCurrent) {
      if (disposed || !isCurrent(request.revision)) return Promise.resolve(null)
      if (failure) return Promise.reject(failure)
      if (pending) throw new Error('background calculations must run serially')
      return new Promise<BackgroundResult<Output>>((resolve, reject) => {
        pending = { revision: request.revision, resolve, reject }
        try {
          worker.postMessage(request)
        } catch (error) {
          pending = null
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (!failure) worker.terminate()
      const rejected = pending
      pending = null
      rejected?.reject(new Error('background computation disposed'))
    },
  }
}
