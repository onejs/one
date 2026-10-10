import { beforeEach, expect, test, vi } from 'vitest'

const host = vi.hoisted(() => ({
  platform: { OS: 'android' },
  createHybrid: vi.fn(),
  background: {
    addTaskListener: vi.fn(() => vi.fn()),
    submit: vi.fn(async () => {}),
    cancel: vi.fn(),
  },
  widgets: {
    writeWidget: vi.fn(async () => {}),
    start: vi.fn(async () => 'activity-id'),
    update: vi.fn(async () => {}),
    end: vi.fn(async () => {}),
  },
  addListener: vi.fn(() => ({ remove: vi.fn() })),
}))

vi.mock('react-native', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-native')>()),
  Platform: host.platform,
  NativeModules: { OneWidgetsBridge: host.widgets },
  NativeEventEmitter: class {
    addListener = host.addListener
  },
}))
vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: host.createHybrid },
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  host.platform.OS = 'android'
  host.createHybrid.mockReturnValue(host.background)
})

test('Android actions report their iOS limit without calling native hosts', async () => {
  const { BackgroundTasks: tasks } =
    await import('../src/platform/background-tasks/index.native')
  const { Widgets: widgets, LiveActivities: activities } =
    await import('../src/platform/widgets/index.native')
  const calls: [string, () => unknown][] = [
    ['BackgroundTasks.defineTask', () => tasks.defineTask('proof', () => {})],
    ['BackgroundTasks.submit', () => tasks.submit('proof')],
    ['BackgroundTasks.cancel', () => tasks.cancel('proof')],
    [
      'Widgets.write',
      () => widgets.write({ title: 'proof', value: '1', subtitle: 'limit' }),
    ],
    ['Widgets.writeView', () => widgets.writeView(null)],
    [
      'LiveActivities.start',
      () => activities.start('proof', { status: 'active', value: '1' }),
    ],
    [
      'LiveActivities.startView',
      () => activities.startView('proof', { lockScreen: null }),
    ],
    [
      'LiveActivities.update',
      () => activities.update('proof', { status: 'active', value: '1' }),
    ],
    [
      'LiveActivities.updateView',
      () => activities.updateView('proof', { lockScreen: null }),
    ],
    ['LiveActivities.end', () => activities.end('proof')],
    ['LiveActivities.onPushToken', () => activities.onPushToken(() => {})],
  ]
  for (const [name, call] of calls) {
    await expect(Promise.resolve().then(call)).rejects.toThrow(
      `${name} requires an iOS native build`
    )
  }
  expect(await tasks.getPending()).toEqual([])
  expect(await activities.pushToken('proof')).toBeNull()
  expect(() => tasks.submit('proof', { earliestBeginDateMs: -1 })).toThrow(RangeError)
  expect(() => tasks.cancel('')).toThrow(TypeError)
  const { One } = await import('../src/one')
  const { proveUnavailableServices } =
    await import('../../../tests/native-features/fixtures/one-unavailable-services')
  const proof = await proveUnavailableServices({
    ...One,
    platform: 'android',
    BackgroundTasks: tasks,
    Widgets: widgets,
    LiveActivities: activities,
  })
  expect(proof.passed).toBe(true)
  expect(proof.checks.length).toBeGreaterThan(60)
  expect(host.createHybrid).not.toHaveBeenCalled()
  expect(host.addListener).not.toHaveBeenCalled()
  for (const call of Object.values(host.widgets)) expect(call).not.toHaveBeenCalled()
})

test('iOS continues delegating actions to the existing native hosts', async () => {
  host.platform.OS = 'ios'
  const { BackgroundTasks: tasks } =
    await import('../src/platform/background-tasks/index.native')
  const { Widgets: widgets, LiveActivities: activities } =
    await import('../src/platform/widgets/index.native')
  const remove = tasks.defineTask('proof', () => {})
  await tasks.submit('proof', {
    earliestBeginDateMs: 123,
    requiresNetworkConnectivity: true,
  })
  tasks.cancel('proof')
  remove()
  expect(host.createHybrid).toHaveBeenCalledWith('OneBackgroundTasks')
  expect(host.background.submit).toHaveBeenCalledWith('proof', 123, true, undefined)
  expect(host.background.cancel).toHaveBeenCalledWith('proof')
  expect(host.background.addTaskListener).toHaveBeenCalledOnce()
  await widgets.write({ title: 'proof', value: '1', subtitle: 'native' })
  expect(host.widgets.writeWidget).toHaveBeenCalledWith('proof', '1', 'native')
  expect(await activities.start('proof', { status: 'active', value: '1' }, true)).toBe(
    'activity-id'
  )
  await activities.update('proof', { status: 'done', value: '2' })
  await activities.end('proof')
  expect(host.widgets.start).toHaveBeenCalledWith('proof', 'active', '1', true)
  expect(host.widgets.update).toHaveBeenCalledWith('proof', 'done', '2')
  expect(host.widgets.end).toHaveBeenCalledWith('proof')
})
