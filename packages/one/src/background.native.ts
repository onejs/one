import { createWorkletExecutor } from './background/executor.native'
import type { BackgroundComputation } from './background/backgroundContract'

export { createLatestComputation } from './background/createLatestComputation'
export { useBackgroundComputation } from './background/useBackgroundComputation'
export type {
  BackgroundComputation,
  BackgroundResult,
  BackgroundState,
} from './background/backgroundContract'

export function defineBackgroundComputation<Input, Output>(
  calculate: (input: Input) => Output
): BackgroundComputation<Input, Output> {
  return Object.freeze({ createExecutor: () => createWorkletExecutor(calculate) })
}

export function __createBackgroundFunction<Args extends unknown[], Output>(
  calculate: (input: Args) => Output
): (...args: Args) => Promise<Output> {
  const executor = defineBackgroundComputation(calculate).createExecutor()
  let revision = 0
  return async (...input) =>
    executor
      .execute({ revision: ++revision, input }, () => true)
      .then((result) => {
        if (!result) throw new Error('background calculation returned no result')
        return result.value
      })
}
