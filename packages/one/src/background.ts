import { createWorkerExecutor } from './background/web'
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
): BackgroundComputation<Input, Output>
export function defineBackgroundComputation<Input, Output>(
  _calculate: (input: Input) => Output,
  createWorker?: () => Worker
): BackgroundComputation<Input, Output> {
  if (!createWorker)
    throw new Error(
      'defineBackgroundComputation requires the One bundler transform and a statically imported calculation'
    )
  return Object.freeze({
    createExecutor: () => createWorkerExecutor<Input, Output>(createWorker),
  })
}
