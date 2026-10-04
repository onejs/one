import { useEffect, useRef, useState } from 'react'
import { AppState, ScrollView, Text, View } from 'react-native'
import { One } from 'one'
import { Action, Results, assert, useResults } from './realapps-api-report'

export const serviceAPIs = [
  'One.AppInfo',
  'One.Browser',
  'One.Clipboard',
  'One.DocumentPicker',
  'One.Haptics',
  'One.ImagePicker',
  'One.LaunchScreen',
  'One.Notifications',
  'One.SecureStore',
  'One.Speech',
  'One.Storage',
  'One.UI.Fonts',
  'One.Updates',
  'One.openSettings',
  'One.openShare',
  'One.openURL',
] as const
const key = 'one-realapps-api-probe'
const value = 'native round trip \u2603'
const fontName = 'OneNativeTestFont-Regular'
const font = require('../assets/OneNativeTestFont-Regular.ttf')

export default function Services() {
  const { results, report, run } = useResults(serviceAPIs)
  const speech = useRef<ReturnType<typeof One.Speech.start> | null>(null)
  const events = useRef<unknown[]>([])
  const opened = useRef<string | null>(null)
  const appStates = useRef<string[]>([])
  const [fontLoaded, setFontLoaded] = useState(false)
  const [coreComplete, setCoreComplete] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('loading')
  useEffect(() => {
    One.Notifications.getPermissions().then((permission) =>
      setNotificationPermission(permission.status)
    )
  }, [])
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (opened.current) {
        appStates.current.push(state)
        report(
          `${opened.current}.appStates`,
          'observed',
          { states: [...appStates.current] },
          'runner must prove system destination and return'
        )
        if (state === 'active') opened.current = null
      }
    })
    return () => {
      sub.remove()
      speech.current?.abort()
    }
  }, [report])

  async function core() {
    await run('One.Notifications', async () => {
      const permission = await One.Notifications.getPermissions()
      assert(permission.granted, 'Schedule probe requires notification permission', permission)
      assert(
        ['granted', 'denied', 'undetermined'].includes(permission.status),
        'Notification permission status invalid',
        permission
      )
      const identifier = 'one-realapps-future-notification'
      try {
        await One.Notifications.cancelScheduled(identifier)
        const id = await One.Notifications.schedule({
          identifier,
          content: { title: 'Real app probe', body: 'Scheduled then canceled' },
          trigger: { type: 'timeInterval', seconds: 3600 },
        })
        assert(id === identifier, 'Scheduled notification id changed', id)
        const before = await One.Notifications.getAllScheduled()
        assert(
          before.some((item) => item.identifier === identifier),
          'Native schedule did not retain notification',
          before
        )
        await One.Notifications.cancelScheduled(identifier)
        const after = await One.Notifications.getAllScheduled()
        assert(
          !after.some((item) => item.identifier === identifier),
          'Native cancellation failed',
          after
        )
        return { permission, id, before, after }
      } finally {
        await One.Notifications.cancelScheduled(identifier)
      }
    })
    await run('One.AppInfo', () => {
      const info = One.AppInfo
      for (const name of ['version', 'build', 'applicationId'] as const) {
        const text = info[name]
        assert(
          typeof text === 'string' && text.length > 0,
          `AppInfo.${name} missing installed identity`,
          info
        )
      }
      return info
    })
    await run('One.Storage', () => {
      const store = One.Storage
      try {
        store.removeItem(key)
        const missing = store.getItem(key)
        assert(missing === null, 'Storage missing key must be null')
        store.setItem(key, value)
        const read = store.getItem(key)
        assert(read === value, 'Storage round trip mismatch', read)
        store.setItem(key, '')
        const empty = store.getItem(key)
        assert(empty === '', 'Storage empty value lost')
        const keys = store.getAllKeys()
        assert(keys.includes(key), 'Storage key absent')
        store.removeItem(key)
        const removed = store.getItem(key)
        assert(removed === null, 'Storage delete failed')
        return { missing, read, empty, keys, removed }
      } finally {
        store.removeItem(key)
      }
    })
    await run('One.SecureStore', async () => {
      const store = One.SecureStore
      try {
        await store.deleteItem(key)
        const missing = await store.getItem(key)
        assert(missing === null, 'SecureStore missing must be null')
        await store.setItem(key, value)
        const read = await store.getItem(key)
        assert(read === value, 'SecureStore round trip mismatch', read)
        await store.deleteItem(key)
        const removed = await store.getItem(key)
        assert(removed === null, 'SecureStore delete failed')
        return { missing, read, removed }
      } finally {
        await store.deleteItem(key)
      }
    })
    await run('One.Clipboard', async () => {
      const set = await One.Clipboard.setString(value)
      const read = await One.Clipboard.getString()
      const has = await One.Clipboard.hasString()
      assert(read === value && has === true, 'Clipboard round trip mismatch', {
        set,
        read,
        has,
      })
      return { set, read, has }
    })
    await run(
      'One.Haptics',
      () => ({
        selection: One.Haptics.selection(),
        impact: One.Haptics.impact('medium'),
        notification: One.Haptics.notification('success'),
      }),
      'observed',
      'native dispatch only; simulator cannot prove physical haptic output'
    )
    await run(
      'One.Speech',
      async () => {
        const available = One.Speech.isAvailable()
        const permission = await One.Speech.getPermissions()
        assert(typeof available === 'boolean', 'Speech availability must be boolean')
        assert(
          ['granted', 'denied', 'undetermined'].includes(permission.status),
          'Speech permission status invalid'
        )
        assert(
          permission.granted === (permission.status === 'granted'),
          'Speech permission inconsistent'
        )
        return { available, permission }
      },
      'observed',
      'availability and permissions only; use speech controls for session events'
    )
    await run(
      'One.Updates',
      () => {
        const update = One.Updates
        const staged = update.getStaged()
        const subscription = update.addStagedListener((next) =>
          report('One.Updates.staged', 'observed', next)
        )
        subscription.remove()
        assert(typeof update.isEnabled === 'boolean', 'Updates enabled invalid')
        return {
          isEnabled: update.isEnabled,
          runtimeVersion: update.runtimeVersion,
          updateId: update.updateId,
          isEmbeddedLaunch: update.isEmbeddedLaunch,
          createdAt: update.createdAt,
          manifest: update.manifest,
          staged,
        }
      },
      'observed',
      'installed update metadata; no reload or live update fetch in app shell'
    )
    setCoreComplete(true)
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12, gap: 8 }}
      testID="realapps-api-services"
    >
      <Results results={results} />
      <Text>{`Notification permission: ${notificationPermission}`}</Text>
      <Action id="notification-permission" onPress={() => {
        One.Notifications.requestPermissions().then((permission) =>
          setNotificationPermission(permission.status)
        )
      }}>
        Request notification permission
      </Action>
      <Action id="core" onPress={() => void core()}>
        Run isolated service checks
      </Action>
      <Text>{coreComplete ? 'Core checks complete' : 'Core checks pending'}</Text>
      <Action
        id="font"
        onPress={() =>
          void run('One.UI.Fonts', async () => {
            const before = One.UI.Fonts.isLoaded(fontName)
            const loaded = await One.UI.Fonts.load({ [fontName]: font })
            const after = One.UI.Fonts.isLoaded(fontName)
            assert(after, 'Font not usable after load', { before, loaded, after })
            setFontLoaded(true)
            return { before, loaded, after, fontName }
          })
        }
      >
        Load fixture font
      </Action>
      <Text
        testID="realapps-api-font-sample"
        style={{ fontSize: 64, fontFamily: fontLoaded ? fontName : undefined }}
      >
        A
      </Text>
      <Text>{`Font loaded: ${fontLoaded}`}</Text>
      <Action
        id="launch-hide"
        onPress={() =>
          void run(
            'One.LaunchScreen',
            () => ({ hide: One.LaunchScreen.hide({ fade: false }) }),
            'observed',
            'shell already mounted; launch retention requires cold-start proof'
          )
        }
      >
        Hide launch screen
      </Action>
      <Action
        id="image-picker-cancel"
        onPress={() =>
          void run('One.ImagePicker', async () => {
            const result = await One.ImagePicker.launchLibrary({
              mediaTypes: 'images',
              selectionLimit: 1,
            })
            assert(
              result.canceled === true && result.assets === null,
              'Expected parent-controlled library cancellation',
              result
            )
            return result
          })
        }
      >
        Open library for runner cancel
      </Action>
      <Action
        id="document-picker-cancel"
        onPress={() =>
          void run('One.DocumentPicker', async () => {
            const result = await One.DocumentPicker.getDocument({ multiple: false })
            assert(
              result.canceled === true && result.assets === null,
              'Expected parent-controlled document cancellation',
              result
            )
            return result
          })
        }
      >
        Open documents for runner cancel
      </Action>
      <Action
        id="browser-cancel"
        onPress={() =>
          void run(
            'One.Browser',
            async () => {
              const result = await One.Browser.open('https://onestack.dev')
              assert(
                ['cancel', 'dismiss', 'opened'].includes(result.type),
                'Unexpected browser completion',
                result
              )
              return result
            },
            'observed',
            'runner must prove browser presented and canceled; Android opened is not cancellation'
          )
        }
      >
        Open browser for runner cancel
      </Action>
      <Action
        id="speech-permission"
        onPress={() =>
          void run(
            'One.Speech.permission',
            () => One.Speech.requestPermissions(),
            'observed'
          )
        }
      >
        Request speech permission
      </Action>
      <Action
        id="speech-start"
        onPress={() =>
          void run(
            'One.Speech',
            () => {
              events.current = []
              speech.current = One.Speech.start({ lang: 'en-US' }, (event) => {
                events.current.push(event)
                report(
                  'One.Speech',
                  event.type === 'error' ? 'failed' : 'observed',
                  { events: [...events.current] },
                  'runner must supply speech and assert transcript/end; native errors remain failures'
                )
              })
              return { started: true, events: [] }
            },
            'observed'
          )
        }
      >
        Start speech session
      </Action>
      <Action
        id="speech-stop"
        onPress={() =>
          void run(
            'One.Speech.stop',
            () => {
              assert(speech.current, 'No speech session')
              return speech.current.stop()
            },
            'observed'
          )
        }
      >
        Stop speech session
      </Action>
      <Action
        id="speech-abort"
        onPress={() =>
          void run(
            'One.Speech.abort',
            () => {
              assert(speech.current, 'No speech session')
              const result = speech.current.abort()
              speech.current = null
              return result
            },
            'observed'
          )
        }
      >
        Abort speech session
      </Action>
      <Action
        id="updates-check"
        onPress={() =>
          void run(
            'One.Updates.check',
            async () => {
              const result = await One.Updates.check()
              assert(
                result.type === 'none' || result.type === 'available',
                'Updates.check result invalid',
                result
              )
              return result
            },
            'observed',
            'parent controls update endpoint; disabled-build errors remain failures'
          )
        }
      >
        Check configured update endpoint
      </Action>
      <Action
        id="updates-fetch"
        onPress={() =>
          void run(
            'One.Updates.fetch',
            async () => {
              const result = await One.Updates.fetch()
              assert(
                result.type === 'none' || result.type === 'fetched',
                'Updates.fetch result invalid',
                result
              )
              return result
            },
            'observed',
            'stages configured update without reloading; parent owns OTA lifecycle proof'
          )
        }
      >
        Fetch configured update
      </Action>
      <Action
        id="share-cancel"
        onPress={() =>
          void run(
            'One.openShare',
            () => One.openShare({ message: 'one realapps API probe' }),
            'observed',
            'void result; runner must prove sheet presentation and cancellation'
          )
        }
      >
        Open share for runner cancel
      </Action>
      <Action
        id="open-url"
        onPress={() => {
          appStates.current = []
          opened.current = 'One.openURL'
          void run(
            'One.openURL',
            () => One.openURL('https://onestack.dev'),
            'observed',
            'runner must prove browser destination and return'
          )
        }}
      >
        Open URL for runner return
      </Action>
      <Action
        id="open-settings"
        onPress={() => {
          appStates.current = []
          opened.current = 'One.openSettings'
          void run(
            'One.openSettings',
            () => One.openSettings(),
            'observed',
            'runner must prove settings destination and return'
          )
        }}
      >
        Open settings for runner return
      </Action>
      <View testID="realapps-api-shell-return-marker">
        <Text>Injected route remains inside the original shell</Text>
      </View>
    </ScrollView>
  )
}
