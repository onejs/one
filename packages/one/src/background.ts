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

export function __createBackgroundFunction<Args extends unknown[], Output>(
  createWorker: () => Worker
): (...args: Args) => Promise<Output> {
  const capacity = Math.max(
    1,
    Math.min(4, (globalThis.navigator.hardwareConcurrency || 2) - 1)
  )
  const pool: {
    executor: ReturnType<typeof createWorkerExecutor<Args, Output>>
    pending: number
  }[] = []
  let revision = 0
  return async (...input) => {
    let slot = pool.reduce<(typeof pool)[number] | undefined>(
      (best, slot) => (!best || slot.pending < best.pending ? slot : best),
      undefined
    )
    if (!slot || (slot.pending > 0 && pool.length < capacity)) {
      slot = { executor: createWorkerExecutor<Args, Output>(createWorker), pending: 0 }
      pool.push(slot)
    }
    const active = slot
    active.pending++
    return active.executor
      .execute({ revision: ++revision, input }, () => true)
      .then(
        (result) => {
          active.pending--
          if (!result) throw new Error('background calculation returned no result')
          return result.value
        },
        (error) => {
          active.pending--
          if (active.executor.failed && pool.includes(active)) {
            active.executor.dispose()
            pool.splice(pool.indexOf(active), 1)
          }
          throw error
        }
      )
  }
}
