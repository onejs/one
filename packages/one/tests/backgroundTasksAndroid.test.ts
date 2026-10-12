import { beforeEach, expect, test, vi } from 'vitest'
import type { BackgroundTaskInvocation } from '../src/platform/specs/OneBackgroundTasks.nitro'

const host = vi.hoisted(() => ({
  registerHeadlessTask:
    vi.fn<
      (
        key: string,
        factory: () => (invocation: BackgroundTaskInvocation) => Promise<void>
      ) => void
    >(),
  background: {
    addTaskListener: vi.fn(
      (
        _launch: (invocation: BackgroundTaskInvocation) => void,
        _expire: (id: string) => void
      ) => vi.fn()
    ),
    complete: vi.fn(),
  },
}))
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppRegistry: { registerHeadlessTask: host.registerHeadlessTask },
}))
vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: () => host.background },
}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

async function setup() {
  const { BackgroundTasks } =
    await import('../src/platform/background-tasks/index.native')
  expect(host.registerHeadlessTask).toHaveBeenCalledWith(
    'OneBackgroundTasks',
    expect.any(Function)
  )
  const task = host.registerHeadlessTask.mock.calls[0][1]()
  return { api: BackgroundTasks, task }
}

test('OS headless invocation runs setup handler without a mounted view and reports its result', async () => {
  const { api, task } = await setup()
  const handler = vi.fn(async () => {})
  const remove = api.defineTask('proof', handler)
  const invocation = { identifier: 'proof', executionId: 'os-execution', kind: 'refresh' }
  await task(invocation)
  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ ...invocation, signal: expect.any(AbortSignal) })
  expect(host.background.complete).toHaveBeenCalledWith('os-execution', true)
  remove()
  await task({ ...invocation, executionId: 'after-removal' })
  expect(handler).toHaveBeenCalledOnce()
  expect(host.background.complete).toHaveBeenLastCalledWith('after-removal', false)
})

test('unknown and failing headless handlers report failure; expiration aborts a running handler', async () => {
  const { api, task } = await setup()
  await task({ identifier: 'unknown', executionId: 'unknown', kind: 'refresh' })
  expect(host.background.complete).toHaveBeenLastCalledWith('unknown', false)
  api.defineTask('fails', () => {
    throw new Error('negative control')
  })
  await task({ identifier: 'fails', executionId: 'failed', kind: 'processing' })
  expect(host.background.complete).toHaveBeenLastCalledWith('failed', false)
  let observed: AbortSignal | undefined
  api.defineTask(
    'expire',
    ({ signal }) =>
      new Promise<void>((resolve) => {
        observed = signal
        signal.addEventListener('abort', () => resolve(), { once: true })
      })
  )
  const active = task({
    identifier: 'expire',
    executionId: 'expired',
    kind: 'processing',
  })
  expect(observed?.aborted).toBe(false)
  const expire = host.background.addTaskListener.mock.calls[0][1] as (id: string) => void
  expire('expired')
  await active
  expect(observed?.aborted).toBe(true)
})
