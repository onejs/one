import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  NativeEventEmitter: class {
    addListener() {}
    removeAllListeners() {}
  },
  Platform: { OS: 'ios' },
  TurboModuleRegistry: { get: vi.fn() },
}))

import type { Spec as NotificationsSpec } from '../src/specs/OneNativeNotificationsNativeModule'

async function loadNamespace(getImpl: (name: string) => unknown, os = 'ios') {
  vi.resetModules()
  const rn = await import('react-native')
  vi.mocked(rn.TurboModuleRegistry.get).mockImplementation(getImpl as never)
  rn.Platform.OS = os
  return (await import('../src/notifications/index.native')).Notifications
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('Notifications without the native module', () => {
  it('degrades reads instead of throwing', async () => {
    const Notifications = await loadNamespace(() => null)
    await expect(Notifications.getPermissions()).resolves.toEqual({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    })
    await expect(Notifications.requestPermissions()).resolves.toEqual({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    })
    await expect(Notifications.getBadgeCount()).resolves.toBe(0)
    await expect(Notifications.setBadgeCount(3)).resolves.toBe(false)
    await expect(Notifications.getChannel('x')).resolves.toBeNull()
    await expect(Notifications.getChannels()).resolves.toEqual([])
    await expect(Notifications.getAllScheduled()).resolves.toEqual([])
    await expect(Notifications.getPresented()).resolves.toEqual([])
    expect(Notifications.getLastResponse()).toBeNull()
  })

  it('makes writes inert instead of throwing', async () => {
    const Notifications = await loadNamespace(() => null)
    expect(() => Notifications.setHandler(null)).not.toThrow()
    expect(() => Notifications.clearLastResponse()).not.toThrow()
    const sub = Notifications.addReceivedListener(() => {})
    expect(() => sub.remove()).not.toThrow()
    const tap = Notifications.addResponseReceivedListener(() => {})
    expect(() => tap.remove()).not.toThrow()
    await expect(Notifications.deleteChannel('x')).resolves.toBeUndefined()
    await expect(Notifications.cancelScheduled('x')).resolves.toBeUndefined()
    await expect(Notifications.cancelAllScheduled()).resolves.toBeUndefined()
    await expect(Notifications.dismiss('x')).resolves.toBeUndefined()
    await expect(Notifications.dismissAll()).resolves.toBeUndefined()
  })

  it('rejects schedule like web', async () => {
    const Notifications = await loadNamespace(() => null)
    await expect(
      Notifications.schedule({ content: { title: 'x' }, trigger: null })
    ).rejects.toThrow('Notifications.schedule needs an iOS or Android build')
  })
})

describe('Notifications boundary mapping', () => {
  function fakeModule(overrides: Partial<NotificationsSpec> = {}) {
    return {
      getPermissions: vi.fn(async () => ({
        status: 'granted',
        granted: true,
        canAskAgain: false,
        ios: { status: 2 },
      })),
      requestPermissions: vi.fn(async () => ({
        status: 'granted',
        granted: true,
        canAskAgain: false,
      })),
      getBadgeCount: vi.fn(async () => 0),
      setBadgeCount: vi.fn(async () => true),
      setNotificationChannel: vi.fn(async (_id: string, channel: { importance: number }) => ({
        id: _id,
        name: 'n',
        importance: channel.importance,
        sound: true,
        showBadge: true,
      })),
      getNotificationChannel: vi.fn(async () => null),
      getNotificationChannels: vi.fn(async () => []),
      deleteNotificationChannel: vi.fn(async () => {}),
      scheduleNotification: vi.fn(async () => 'scheduled-id'),
      cancelScheduledNotification: vi.fn(async () => {}),
      cancelAllScheduledNotifications: vi.fn(async () => {}),
      getAllScheduledNotifications: vi.fn(async () => []),
      getPresentedNotifications: vi.fn(async () => []),
      dismissNotification: vi.fn(async () => {}),
      dismissAllNotifications: vi.fn(async () => {}),
      presentNotification: vi.fn(async () => {}),
      getLastNotificationResponse: vi.fn(() => null),
      clearLastNotificationResponse: vi.fn(() => {}),
      addListener: vi.fn(() => {}),
      removeListeners: vi.fn(() => {}),
      ...overrides,
    }
  }

  it('maps the ios authorization int to its string union', async () => {
    const Notifications = await loadNamespace(() => fakeModule())
    const response = await Notifications.getPermissions()
    expect(response.ios).toEqual({ status: 'authorized' })
  })

  it('maps channel importance strings to ints and back', async () => {
    const module = fakeModule()
    const Notifications = await loadNamespace(() => module, 'android')
    const created = await Notifications.setChannel('c', {
      name: 'n',
      importance: 'high',
    })
    expect(module.setNotificationChannel).toHaveBeenCalledWith('c', {
      name: 'n',
      importance: 4,
    })
    expect(created?.importance).toBe('high')
  })

  it('maps legacy numeric importances', async () => {
    const module = fakeModule()
    const Notifications = await loadNamespace(() => module, 'android')
    await Notifications.setChannel('c', { name: 'n', importance: 2 })
    expect(module.setNotificationChannel).toHaveBeenCalledWith('c', {
      name: 'n',
      importance: 2,
    })
  })

  it('normalizes date triggers to timestamps', async () => {
    const module = fakeModule()
    const Notifications = await loadNamespace(() => module)
    const date = new Date(1790000000000)
    await Notifications.schedule({
      content: { title: 'x' },
      trigger: { type: 'date', date },
    })
    expect(module.scheduleNotification).toHaveBeenCalledWith({
      content: { title: 'x' },
      trigger: { type: 'date', date: 1790000000000 },
    })
  })

  it('throws the same importance message on native and web', async () => {
    const Notifications = await loadNamespace(() => fakeModule())
    const message =
      'Notifications.setChannel: importance must be one of none, min, low, default, high, max'
    await expect(
      Notifications.setChannel('c', { name: 'n', importance: 'bogus' as never })
    ).rejects.toThrow(message)
    const web = await import('../src/notifications/index')
    await expect(
      web.Notifications.setChannel('c', { name: 'n', importance: 'bogus' as never })
    ).rejects.toThrow(message)
  })

  it('resolves channel reads empty on ios without touching the module', async () => {
    // the ios native module implements no channel methods; shared code must
    // not need a Platform.OS check to call them.
    const { getNotificationChannel: _gc, ...rest } = fakeModule()
    void _gc
    const { getNotificationChannels: _gcs, ...rest2 } = rest
    void _gcs
    const { deleteNotificationChannel: _dc, ...iosModule } = rest2
    void _dc
    const { setNotificationChannel: _sc, ...iosModuleNoChannels } = iosModule
    void _sc
    const Notifications = await loadNamespace(() => iosModuleNoChannels, 'ios')
    await expect(Notifications.getChannel('x')).resolves.toBeNull()
    await expect(Notifications.getChannels()).resolves.toEqual([])
    await expect(Notifications.deleteChannel('x')).resolves.toBeUndefined()
    await expect(
      Notifications.setChannel('x', { name: 'n', importance: 'default' })
    ).resolves.toBeNull()
  })
})

describe('Notifications boundary mappers', () => {
  it('maps every authorization status', async () => {
    const { fromNativeAuthorizationStatus } = await import('../src/notifications/types')
    expect([
      fromNativeAuthorizationStatus(0),
      fromNativeAuthorizationStatus(1),
      fromNativeAuthorizationStatus(2),
      fromNativeAuthorizationStatus(3),
      fromNativeAuthorizationStatus(4),
    ]).toEqual(['notDetermined', 'denied', 'authorized', 'provisional', 'ephemeral'])
  })

  it('maps every importance both ways', async () => {
    const { fromNativeImportance, toNativeImportance } = await import(
      '../src/notifications/types'
    )
    const pairs = [
      ['none', 0],
      ['min', 1],
      ['low', 2],
      ['default', 3],
      ['high', 4],
      ['max', 5],
    ] as const
    for (const [name, value] of pairs) {
      expect(toNativeImportance(name)).toBe(value)
      expect(fromNativeImportance(value)).toBe(name)
    }
    expect(() => toNativeImportance(6)).toThrow()
    expect(() => toNativeImportance(-1)).toThrow()
  })
})
