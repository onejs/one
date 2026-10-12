import { describe, expect, it } from 'vitest'
import { createLatestComputation } from './createLatestComputation'
import type {
  BackgroundExecutor,
  BackgroundResult,
  BackgroundState,
} from './backgroundContract'

describe('latest background computation', () => {
  it('withdraws the current result and runs only the newest waiting input', async () => {
    const dispatched: number[] = []
    const replies: Array<(result: BackgroundResult<number>) => void> = []
    const states: BackgroundState<number>[] = []
    const executor: BackgroundExecutor<number, number> = {
      execute(request) {
        dispatched.push(request.input)
        return new Promise((resolve) => replies.push(resolve))
      },
      dispose() {},
    }
    const owner = createLatestComputation({ createExecutor: () => executor }, (state) =>
      states.push(state)
    )
    owner.update(1)
    owner.update(2)
    owner.update(3)
    replies[0]({ revision: 1, value: 2 })
    await Promise.resolve()
    expect(dispatched).toEqual([1, 3])
    expect(owner.getCurrent()).toBeNull()
    expect(states.some((state) => state.phase === 'ready')).toBe(false)
    replies[1]({ revision: 3, value: 6 })
    await Promise.resolve()
    expect(owner.getCurrent()).toEqual({ revision: 3, value: 6 })
    owner.update(4)
    expect(owner.getCurrent()).toBeNull()
    owner.dispose()
    replies[2]({ revision: 4, value: 8 })
    await Promise.resolve()
    expect(owner.getCurrent()).toBeNull()
    expect(states.filter((state) => state.phase === 'ready')).toHaveLength(1)
  })

  it('ignores an obsolete failure and publishes a current failure', async () => {
    const failures: Array<(reason: Error) => void> = []
    const states: BackgroundState<number>[] = []
    const owner = createLatestComputation<number, number>(
      {
        createExecutor: () => ({
          execute: () => new Promise((_resolve, reject) => failures.push(reject)),
          dispose() {},
        }),
      },
      (state) => states.push(state)
    )
    owner.update(1)
    owner.update(2)
    failures[0](new Error('obsolete'))
    await Promise.resolve()
    expect(states.some((state) => state.phase === 'failed')).toBe(false)
    failures[1](new Error('current'))
    await Promise.resolve()
    expect(states.at(-1)).toMatchObject({
      phase: 'failed',
      revision: 2,
      error: new Error('current'),
    })
    owner.dispose()
  })
})
