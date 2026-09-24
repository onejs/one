import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet } = vi.hoisted(() => ({
  // stands in for the OneNotifications hybrid object lookup: null means not
  // linked.
  mockGet: vi.fn(),
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    hasHybridObject: (name: string) => name === 'OneNotifications' && mockGet() != null,
    createHybridObject: (name: string) => (name === 'OneNotifications' ? mockGet() : null),
  },
}))

import type { OneNotifications } from '../src/specs/OneNotifications.nitro'

async function loadNamespace(getImpl: () => unknown, os = 'ios') {
  vi.resetModules()
  const rn = await import('react-native')
  mockGet.mockImplementation(getImpl)
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

  it('rejects the push token without the native module', async () => {
    const Notifications = await loadNamespace(() => null)
    await expect(Notifications.getDevicePushTokenAsync()).rejects.toThrow(
      'Notifications.getDevicePushTokenAsync needs an iOS or Android build'
    )
    const sub = Notifications.addPushTokenListener(() => {})
    expect(() => sub.remove()).not.toThrow()
  })
})

describe('Notifications boundary mapping', () => {
  function fakeModule(overrides: Partial<OneNotifications> = {}) {
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
      setNotificationChannel: vi.fn(
        async (_id: string, channel: { importance: number }) => ({
          id: _id,
          name: 'n',
          importance: channel.importance,
          sound: true,
          showBadge: true,
        })
      ),
      getNotificationChannel: vi.fn(async () => undefined),
      getNotificationChannels: vi.fn(async () => []),
      deleteNotificationChannel: vi.fn(async () => {}),
      scheduleNotification: vi.fn(async () => 'scheduled-id'),
      cancelScheduledNotification: vi.fn(async () => {}),
      cancelAllScheduledNotifications: vi.fn(async () => {}),
      getAllScheduledNotifications: vi.fn(async () => []),
      getPresentedNotifications: vi.fn(async () => []),
      dismissNotification: vi.fn(async () => {}),
      dismissAllNotifications: vi.fn(async () => {}),
      presentNotification: vi.fn(() => {}),
      getDevicePushToken: vi.fn(async () => ({ type: 'ios', data: 'cafef00d' })),
      setListeners: vi.fn(() => {}),
      getLastNotificationResponse: vi.fn(() => undefined),
      clearLastNotificationResponse: vi.fn(() => {}),
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

  const nativeNotification = {
    request: {
      identifier: 'n1',
      content: { title: 'hi', data: { k: 1 }, sound: false },
      trigger: { type: 'timeInterval' as const, seconds: 5, repeats: false },
    },
    date: 1790000000000,
  }
  const publicNotification = {
    request: {
      identifier: 'n1',
      content: {
        title: 'hi',
        subtitle: null,
        body: null,
        data: { k: 1 },
        sound: false,
        badge: null,
      },
      trigger: { type: 'timeInterval', seconds: 5, repeats: false },
    },
    date: 1790000000000,
  }

  it('restores public nulls and trigger variants from native shapes', async () => {
    const Notifications = await loadNamespace(() =>
      fakeModule({
        getPresentedNotifications: vi.fn(async () => [nativeNotification]),
        getAllScheduledNotifications: vi.fn(async () => [
          {
            identifier: 's1',
            content: { data: {}, sound: true, badge: 2 },
            trigger: { type: 'date' as const, date: 1790000000000 },
          },
        ]),
        getLastNotificationResponse: vi.fn(() => ({
          notification: nativeNotification,
          actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        })),
      })
    )
    expect(await Notifications.getPresented()).toStrictEqual([publicNotification])
    expect(await Notifications.getAllScheduled()).toStrictEqual([
      {
        identifier: 's1',
        content: { title: null, subtitle: null, body: null, data: {}, sound: true, badge: 2 },
        trigger: { type: 'date', date: 1790000000000 },
      },
    ])
    expect(Notifications.getLastResponse()).toStrictEqual({
      notification: publicNotification,
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    })
  })

  it('sends content data as json values only', async () => {
    const module = fakeModule()
    const Notifications = await loadNamespace(() => module)
    await Notifications.schedule({
      content: { data: { keep: [1, undefined], nested: { a: 'b', gone: undefined }, fn: () => {} } },
      trigger: null,
    })
    expect(module.scheduleNotification.mock.calls[0][0].content.data).toStrictEqual({
      keep: [1, null],
      nested: { a: 'b' },
    })
    expect(module.scheduleNotification.mock.calls[0][0].trigger).toBeUndefined()
  })

  it('splits the code off a native rejection', async () => {
    const Notifications = await loadNamespace(() =>
      fakeModule({
        scheduleNotification: vi.fn(async () => {
          throw new Error('E_NOTIFICATIONS_TRIGGER: timeInterval seconds must be positive')
        }),
      })
    )
    const error = await Notifications.schedule({
      content: {},
      trigger: { type: 'timeInterval', seconds: 0 },
    }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      code: 'E_NOTIFICATIONS_TRIGGER',
      message: 'timeInterval seconds must be positive',
    })
  })

  it('fans native arrivals out and answers the presentation round trip', async () => {
    const module = fakeModule()
    const Notifications = await loadNamespace(() => module)
    const received: unknown[] = []
    Notifications.addReceivedListener((notification) => received.push(notification))
    expect(module.setListeners).toHaveBeenCalledTimes(1)
    const [onReceived] = module.setListeners.mock.calls[0] as unknown as [
      (requestId: string, notification: typeof nativeNotification) => void,
    ]
    onReceived('r1', nativeNotification)
    expect(received).toStrictEqual([publicNotification])
    // no handler set: show everything, like expo.
    expect(module.presentNotification).toHaveBeenCalledWith('r1', {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
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

  it('resolves the push token from the native module', async () => {
    const Notifications = await loadNamespace(() => fakeModule())
    await expect(Notifications.getDevicePushTokenAsync()).resolves.toEqual({
      type: 'ios',
      data: 'cafef00d',
    })
  })

  it('rejects a malformed push token', async () => {
    const Notifications = await loadNamespace(() =>
      fakeModule({ getDevicePushToken: vi.fn(async () => ({ type: 'web', data: '' })) })
    )
    await expect(Notifications.getDevicePushTokenAsync()).rejects.toThrow(
      'Notifications.getDevicePushTokenAsync did not return a push token'
    )
  })

  it('rejects the web push token like native-less', async () => {
    const web = await import('../src/notifications/index')
    await expect(web.Notifications.getDevicePushTokenAsync()).rejects.toThrow(
      'Notifications.getDevicePushTokenAsync needs an iOS or Android build'
    )
    expect(() => web.Notifications.addPushTokenListener(() => {}).remove()).not.toThrow()
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
    const { fromNativeImportance, toNativeImportance } =
      await import('../src/notifications/types')
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
