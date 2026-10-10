import { createWorkletRuntime, runOnRuntimeAsync } from 'react-native-worklets'
import type { BackgroundExecutor } from './backgroundContract'
import type { WorkletRuntime } from 'react-native-worklets'

// the runtime survives mounts; queued owners check freshness before dispatch.
let runtime: WorkletRuntime | null = null
let queue: Promise<void> = Promise.resolve()

export function createWorkletExecutor<Input, Output>(
  calculate: (input: Input) => Output
): BackgroundExecutor<Input, Output> {
  let disposed = false
  return {
    execute(request, isCurrent) {
      const job = queue.then(async () => {
        if (disposed || !isCurrent(request.revision)) return null
        runtime ??= createWorkletRuntime({ name: 'one-background' })
        const value = await runOnRuntimeAsync(
          runtime,
          (input: Input) => {
            'worklet'
            const result = calculate(input)
            if (result instanceof Promise)
              throw new TypeError('background computations must be synchronous')
            return result
          },
          request.input
        )
        return { revision: request.revision, value }
      })
      queue = job.then(
        () => undefined,
        () => undefined
      )
      return job
    },
    dispose() {
      disposed = true
    },
  }
}
