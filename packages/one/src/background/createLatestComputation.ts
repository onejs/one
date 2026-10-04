import type {
  BackgroundComputation,
  BackgroundRequest,
  BackgroundResult,
  BackgroundState,
} from './backgroundContract'

// one calculation runs while updates replace the single waiting input.
export function createLatestComputation<Input, Output>(
  definition: BackgroundComputation<Input, Output>,
  changed: (state: BackgroundState<Output>) => void
) {
  const executor = definition.createExecutor()
  let revision = 0
  let disposed = false
  let computing = false
  let waiting: BackgroundRequest<Input> | null = null
  let result: BackgroundResult<Output> | null = null
  const isCurrent = (value: number) => !disposed && value === revision

  async function drain() {
    computing = true
    while (!disposed && waiting) {
      const request = waiting
      waiting = null
      try {
        const computed = await executor.execute(request, isCurrent)
        if (computed?.revision === request.revision && isCurrent(request.revision)) {
          result = computed
          changed({ phase: 'ready', result: computed })
        }
      } catch (error) {
        if (isCurrent(request.revision))
          changed({
            phase: 'failed',
            revision: request.revision,
            error: error instanceof Error ? error : new Error(String(error)),
          })
      }
    }
    computing = false
  }

  return {
    update(input: Input) {
      if (disposed) return
      revision++
      result = null
      waiting = { revision, input }
      changed({ phase: 'computing', revision })
      if (!computing) void drain()
    },
    getCurrent: () => result,
    dispose() {
      if (disposed) return
      disposed = true
      result = null
      waiting = null
      executor.dispose()
    },
  }
}
