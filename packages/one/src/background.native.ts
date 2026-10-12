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
