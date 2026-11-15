import { createWorkletRuntime, runOnRuntimeAsync } from 'react-native-worklets'
import type { BackgroundExecutor } from './backgroundContract'
import type { WorkletRuntime } from 'react-native-worklets'

const runtimes: { runtime: WorkletRuntime | null; queue: Promise<void> }[] = Array.from(
  { length: 4 },
  () => ({ runtime: null, queue: Promise.resolve() })
)
let nextRuntime = 0

export function createWorkletExecutor<Input, Output>(
  calculate: (input: Input) => Output
): BackgroundExecutor<Input, Output> {
  let disposed = false
  return {
    execute(request, isCurrent) {
      if (disposed || !isCurrent(request.revision)) return Promise.resolve(null)
      const index = nextRuntime++ % runtimes.length
      const slot = runtimes[index]
      const job = slot.queue.then(async () => {
        if (disposed || !isCurrent(request.revision)) return null
        slot.runtime ??= createWorkletRuntime({ name: `one-background-${index}` })
        const value = await runOnRuntimeAsync(
          slot.runtime,
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
      slot.queue = job.then(
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
