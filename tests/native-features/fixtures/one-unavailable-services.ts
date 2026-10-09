import type { One as OneAPI } from 'one'

export async function proveUnavailableServices(One: typeof OneAPI) {
  const checks: string[] = []
  function equal(actual: unknown, expected: unknown, name: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`)
    }
    checks.push(name)
  }
  async function rejected(operation: string, call: () => unknown) {
    let failure: unknown
    try {
      await call()
    } catch (error) {
      failure = error
    }
    if (
      !(failure instanceof Error) ||
      failure.message !== `${operation} needs an iOS or Android build`
    ) {
      throw new Error(
        `${operation}: expected the missing-native rejection, got ${String(failure)}`
      )
    }
    checks.push(operation)
  }
  async function requiresIOS(operation: string, call: () => unknown) {
    let failure: unknown
    try {
      await call()
    } catch (error) {
      failure = error
    }
    const expected = `${operation} requires an iOS native build`
    if (!(failure instanceof Error) || failure.message !== expected) {
      throw new Error(`${operation}: expected ${expected}, got ${String(failure)}`)
    }
    checks.push(operation)
  }

  equal(
    One.LocalAuthentication.canEvaluatePolicy(),
    { available: false, biometryType: 'none' },
    'LocalAuthentication.canEvaluatePolicy'
  )
  equal(await One.KeepAwake.isEnabled(), false, 'KeepAwake.isEnabled')
  equal(await One.Print.isAvailable(), false, 'Print.isAvailable')
  equal(await One.QuickActions.getItems(), [], 'QuickActions.getItems')
  equal(One.QuickActions.getInitialAction(), null, 'QuickActions.getInitialAction')
  equal(One.Location.getPermissionStatus(), 'denied', 'Location.getPermissionStatus')
  equal(
    await One.Location.requestWhenInUsePermission(),
    'denied',
    'Location.requestWhenInUsePermission'
  )
  equal(await One.Location.geocodeAddress('Honolulu'), [], 'Location.geocodeAddress')
  equal(await One.Location.reverseGeocode(21.3, -157.8), [], 'Location.reverseGeocode')
  equal(
    await One.Audio.getRecordingPermissionStatus(),
    'denied',
    'Audio.getRecordingPermissionStatus'
  )
  equal(
    await One.Audio.requestRecordingPermission(),
    'denied',
    'Audio.requestRecordingPermission'
  )
  equal(
    await One.Audio.getPlaybackStatus(),
    { state: 'idle', positionMs: 0 },
    'Audio.getPlaybackStatus'
  )
  equal(
    await One.Audio.getRecordingStatus(),
    { state: 'idle', durationMs: 0 },
    'Audio.getRecordingStatus'
  )
  equal(
    One.PhotoLibrary.getAddPermissionStatus(),
    'denied',
    'PhotoLibrary.getAddPermissionStatus'
  )
  equal(
    One.PhotoLibrary.getReadPermissionStatus(),
    'denied',
    'PhotoLibrary.getReadPermissionStatus'
  )
  equal(
    await One.PhotoLibrary.requestAddPermission(),
    'denied',
    'PhotoLibrary.requestAddPermission'
  )
  equal(
    await One.PhotoLibrary.requestReadPermission(),
    'denied',
    'PhotoLibrary.requestReadPermission'
  )
  equal(
    await One.PhotoLibrary.listAssets(),
    { assets: [], totalCount: 0 },
    'PhotoLibrary.listAssets'
  )
  equal(
    await One.PhotoLibrary.listAlbums(),
    { albums: [], totalCount: 0 },
    'PhotoLibrary.listAlbums'
  )
  equal(
    await One.MapServices.search('coffee', { latitude: 21.3, longitude: -157.8 }),
    [],
    'MapServices.search'
  )
  equal(
    await One.MapServices.autocomplete('coffee', { latitude: 21.3, longitude: -157.8 }),
    [],
    'MapServices.autocomplete'
  )
  equal(
    One.AppTracking.getPermissionStatus(),
    'denied',
    'AppTracking.getPermissionStatus'
  )
  equal(
    await One.AppTracking.requestPermission(),
    'denied',
    'AppTracking.requestPermission'
  )
  equal(await One.AppIcon.isSupported(), false, 'AppIcon.isSupported')
  equal(await One.AppIcon.getCurrentName(), '', 'AppIcon.getCurrentName')
  equal(
    await One.ScreenOrientation.getOrientation(),
    'unknown',
    'ScreenOrientation.getOrientation'
  )
  equal(await One.ScreenCapture.getState(), 'unspecified', 'ScreenCapture.getState')
  equal(await One.Purchases.getProducts(['one-proof']), [], 'Purchases.getProducts')
  equal(
    await One.Device.getInfo(),
    {
      model: '',
      systemName: '',
      systemVersion: '',
      interfaceIdiom: '',
      isSimulator: false,
    },
    'Device.getInfo'
  )
  equal(
    await One.Device.getLocalizationInfo(),
    {
      localeIdentifier: '',
      preferredLanguages: [],
      calendarIdentifier: '',
      timeZoneIdentifier: '',
      timeZoneOffsetSeconds: 0,
    },
    'Device.getLocalizationInfo'
  )
  equal(await One.BackgroundTasks.getPending(), [], 'BackgroundTasks.getPending')
  equal(
    One.DeviceAttestation.getAvailability(),
    { appAttest: false, deviceCheck: false },
    'DeviceAttestation.getAvailability'
  )
  equal(One.Contacts.getPermissionStatus(), 'denied', 'Contacts.getPermissionStatus')
  equal(await One.Contacts.requestPermission(), 'denied', 'Contacts.requestPermission')
  equal(await One.Contacts.search('One'), [], 'Contacts.search')
  equal(One.Calendar.getPermissionStatus(), 'denied', 'Calendar.getPermissionStatus')
  equal(await One.Calendar.requestPermission(), 'denied', 'Calendar.requestPermission')
  equal(await One.Calendar.list(0, 1000), [], 'Calendar.list')
  equal(
    One.Calendar.getRemindersPermissionStatus(),
    'denied',
    'Calendar.getRemindersPermissionStatus'
  )
  equal(
    await One.Calendar.requestRemindersPermission(),
    'denied',
    'Calendar.requestRemindersPermission'
  )
  equal(await One.Calendar.listReminders(), [], 'Calendar.listReminders')
  equal(await One.LiveActivities.pushToken('one-proof'), null, 'LiveActivities.pushToken')

  await One.KeepAwake.setEnabled(true)
  await One.StoreReview.requestReview()
  await One.QuickActions.setItems([{ id: 'one-proof', title: 'One proof' }])
  One.QuickActions.clearInitialAction()
  await One.AppIcon.setIcon()
  equal(await One.ScreenOrientation.lock('portrait'), 'unknown', 'ScreenOrientation.lock')
  equal(await One.ScreenOrientation.unlock(), 'unknown', 'ScreenOrientation.unlock')
  await requiresIOS('BackgroundTasks.submit', () =>
    One.BackgroundTasks.submit('one-proof')
  )
  await requiresIOS('BackgroundTasks.defineTask', () =>
    One.BackgroundTasks.defineTask('one-proof', () => {})
  )
  await requiresIOS('BackgroundTasks.cancel', () =>
    One.BackgroundTasks.cancel('one-proof')
  )
  await requiresIOS('Widgets.write', () =>
    One.Widgets.write({ title: 'One', value: 'proof', subtitle: 'absent' })
  )
  await requiresIOS('Widgets.writeView', () => One.Widgets.writeView(null))
  await requiresIOS('LiveActivities.start', () =>
    One.LiveActivities.start('One', { status: 'proof', value: 'absent' })
  )
  await requiresIOS('LiveActivities.startView', () =>
    One.LiveActivities.startView('One', { lockScreen: null })
  )
  await requiresIOS('LiveActivities.update', () =>
    One.LiveActivities.update('one-proof', { status: 'proof', value: 'absent' })
  )
  await requiresIOS('LiveActivities.updateView', () =>
    One.LiveActivities.updateView('one-proof', { lockScreen: null })
  )
  await requiresIOS('LiveActivities.end', () => One.LiveActivities.end('one-proof'))
  await requiresIOS('LiveActivities.onPushToken', () =>
    One.LiveActivities.onPushToken(() => {})
  )
  await One.Audio.stop()
  await One.Audio.setNowPlayingInfo({ title: 'One proof' })
  await One.Audio.clearNowPlayingInfo()
  checks.push('effects-completed')

  const removers = [
    One.QuickActions.addListener(() => {}),
    One.Location.watchPosition(
      () => {},
      () => {}
    ),
    One.Audio.watchInterruptions(() => {}),
    One.Audio.watchRemoteCommands(() => {}),
    One.ScreenOrientation.addChangeListener(() => {}),
    One.ScreenCapture.addStateListener(() => {}),
    One.ScreenCapture.addScreenshotListener(() => {}),
    One.Purchases.addTransactionListener(() => {}),
    One.BackgroundTasks.defineTask('one-proof', () => {}),
    One.AppIntents.defineAction('one-proof', () => 'proof'),
    One.LiveActivities.onPushToken(() => {}),
  ]
  for (const remove of removers) {
    remove()
    remove()
  }
  checks.push('idempotent-removers')

  await rejected('LocalAuthentication.evaluatePolicy', () =>
    One.LocalAuthentication.evaluatePolicy('One proof')
  )
  await rejected('ProtectedStore.getItem', () =>
    One.ProtectedStore.getItem('one-proof', 'One proof', 'biometryCurrentSet')
  )
  await rejected('Print.printPdf', () => One.Print.printPdf('file:///one-proof.pdf'))
  await rejected('Location.getCurrentPosition', () => One.Location.getCurrentPosition())
  await rejected('Audio.play', () => One.Audio.play('file:///one-proof.mp3'))
  await rejected('Audio.startRecording', () => One.Audio.startRecording())
  await rejected('Audio.stopRecording', () => One.Audio.stopRecording())
  await rejected('Share.share', () =>
    One.Share.share([{ type: 'text', value: 'One proof' }])
  )
  await rejected('PhotoLibrary.getAsset', () => One.PhotoLibrary.getAsset('one-proof'))
  await rejected('PhotoLibrary.saveImage', () =>
    One.PhotoLibrary.saveImage('file:///one-proof.png')
  )
  await rejected('MapServices.resolveSuggestion', () =>
    One.MapServices.resolveSuggestion('one-proof')
  )
  await rejected('ScreenCapture.captureWindow', () => One.ScreenCapture.captureWindow())
  await rejected('Purchases.purchase', () => One.Purchases.purchase('one-proof'))
  await rejected('Purchases.getCurrentEntitlements', () =>
    One.Purchases.getCurrentEntitlements()
  )
  await rejected('DeviceAttestation.generateKey', () =>
    One.DeviceAttestation.generateKey()
  )
  await rejected('DeviceAttestation.generateDeviceToken', () =>
    One.DeviceAttestation.generateDeviceToken()
  )
  await rejected('Contacts.create', () =>
    One.Contacts.create({
      givenName: 'One',
      familyName: 'proof',
      phoneNumbers: [],
      emailAddresses: [],
    })
  )
  await rejected('Calendar.create', () =>
    One.Calendar.create({ title: 'One proof', startMs: 0, endMs: 1000 })
  )
  await rejected('LiveActivities.start', () =>
    One.LiveActivities.start('One', { status: 'proof', value: 'absent' })
  )

  const invalidCalls: [string, () => unknown, string][] = [
    [
      'ScreenCapture.captureView',
      () => One.ScreenCapture.captureView(0),
      'ScreenCapture.captureView requires a positive 32-bit integer view tag',
    ],
    [
      'BackgroundTasks.submit',
      () => One.BackgroundTasks.submit('one-proof', { earliestBeginDateMs: -1 }),
      'BackgroundTasks.submit earliestBeginDateMs must be a timestamp',
    ],
    [
      'BackgroundTasks.cancel',
      () => One.BackgroundTasks.cancel(''),
      'BackgroundTasks.cancel requires an identifier',
    ],
  ]
  for (const [operation, call, message] of invalidCalls) {
    let failure: unknown
    try {
      call()
    } catch (error) {
      failure = error
    }
    if (!(failure instanceof Error) || failure.message !== message) {
      throw new Error(
        `${operation}: expected a synchronous input error, got ${String(failure)}`
      )
    }
    checks.push(`${operation}:invalid`)
  }

  return { passed: true, checks }
}
