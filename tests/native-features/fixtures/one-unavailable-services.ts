import type { One as OneAPI } from 'one'

export async function proveUnavailableServices(One: typeof OneAPI) {
  const checks: string[] = []
  function equal(actual: unknown, expected: unknown, name: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`)
    }
    checks.push(name)
  }
  async function rejected(
    operation: string,
    call: () => unknown,
    expected = `${operation} needs an iOS or Android build`
  ) {
    let failure: unknown
    try {
      await call()
    } catch (error) {
      failure = error
    }
    if (!(failure instanceof Error) || failure.message !== expected) {
      throw new Error(
        `${operation}: expected the missing-native rejection, got ${String(failure)}`
      )
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
  equal(One.Barometer.isAvailable(), false, 'Barometer.isAvailable')
  One.Barometer.setUpdateInterval(100)
  equal(await One.Battery.getLevel(), 1, 'Battery.getLevel')
  equal(await One.Battery.getState(), 'unknown', 'Battery.getState')
  equal(
    await One.Battery.getPowerState(),
    { batteryLevel: 1, batteryState: 'unknown', lowPowerMode: false },
    'Battery.getPowerState'
  )
  equal(await One.Battery.isLowPowerModeEnabled(), false, 'Battery.isLowPowerModeEnabled')
  equal(One.Battery.isAvailable(), false, 'Battery.isAvailable')
  equal(await One.Brightness.get(), 1, 'Brightness.get')
  await One.Brightness.set(0.5)
  equal(await One.Brightness.getSystem(), 1, 'Brightness.getSystem')
  await One.Brightness.setSystem(0.5)
  equal(await One.Brightness.getSystemMode(), 'unknown', 'Brightness.getSystemMode')
  await One.Brightness.setSystemMode('manual')
  equal(await One.Brightness.isUsingSystem(), true, 'Brightness.isUsingSystem')
  await One.Brightness.restoreSystem()
  equal(
    await One.Brightness.getPermissions(),
    { status: 'denied', granted: false, canAskAgain: false },
    'Brightness.getPermissions'
  )
  equal(
    await One.Brightness.requestPermissions(),
    { status: 'denied', granted: false, canAskAgain: false },
    'Brightness.requestPermissions'
  )
  equal(One.Brightness.isAvailable(), false, 'Brightness.isAvailable')
  equal(One.LightSensor.isAvailable(), false, 'LightSensor.isAvailable')
  One.LightSensor.setUpdateInterval(100)
  equal(One.Pedometer.isAvailable(), false, 'Pedometer.isAvailable')
  equal(
    await One.Pedometer.getPermissions(),
    { status: 'denied', granted: false, canAskAgain: false },
    'Pedometer.getPermissions'
  )
  equal(
    await One.Pedometer.requestPermissions(),
    { status: 'denied', granted: false, canAskAgain: false },
    'Pedometer.requestPermissions'
  )
  equal(One.SpeechSynthesis.maxInputLength, 0, 'SpeechSynthesis.maxInputLength')
  One.SpeechSynthesis.speak('one proof')
  await One.SpeechSynthesis.stop()
  await One.SpeechSynthesis.pause()
  await One.SpeechSynthesis.resume()
  equal(await One.SpeechSynthesis.isSpeaking(), false, 'SpeechSynthesis.isSpeaking')
  equal(await One.SpeechSynthesis.getAvailableVoices(), [], 'SpeechSynthesis.getAvailableVoices')
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
  if (One.platform === 'android') {
    // BackgroundTasks schedules through WorkManager on Android, so it is
    // not part of the unavailable set there; the Android proof script
    // covers its schedule and injected-delivery contract on device.
    const actions: [string, () => unknown][] = [
      [
        'Widgets.write',
        () => One.Widgets.write({ title: 'One', value: 'proof', subtitle: 'absent' }),
      ],
      ['Widgets.writeView', () => One.Widgets.writeView(null)],
      [
        'LiveActivities.startView',
        () => One.LiveActivities.startView('One', { lockScreen: null }),
      ],
      [
        'LiveActivities.update',
        () =>
          One.LiveActivities.update('one-proof', { status: 'proof', value: 'absent' }),
      ],
      [
        'LiveActivities.updateView',
        () => One.LiveActivities.updateView('one-proof', { lockScreen: null }),
      ],
      ['LiveActivities.end', () => One.LiveActivities.end('one-proof')],
      ['LiveActivities.onPushToken', () => One.LiveActivities.onPushToken(() => {})],
    ]
    for (const [operation, call] of actions) {
      await rejected(operation, call, `${operation} requires an iOS native build`)
    }
  } else {
    await One.BackgroundTasks.submit('one-proof')
    One.BackgroundTasks.cancel('one-proof')
    await One.Widgets.write({ title: 'One', value: 'proof', subtitle: 'absent' })
    await One.LiveActivities.update('one-proof', { status: 'proof', value: 'absent' })
    await One.LiveActivities.end('one-proof')
  }
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
    One.AppIntents.defineAction('one-proof', () => 'proof'),
    ...(One.platform === 'android'
      ? []
      : [
          One.BackgroundTasks.defineTask('one-proof', () => {}),
          One.LiveActivities.onPushToken(() => {}),
        ]),
  ]
  for (const remove of removers) {
    remove()
    remove()
  }
  checks.push('idempotent-removers')
  for (const subscription of [
    One.Barometer.addListener(() => {}),
    One.Battery.addLevelListener(() => {}),
    One.Battery.addStateListener(() => {}),
    One.Battery.addLowPowerModeListener(() => {}),
    One.Brightness.addListener(() => {}),
    One.LightSensor.addListener(() => {}),
    One.Pedometer.watchStepCount(() => {}),
  ]) {
    subscription.remove()
    subscription.remove()
  }
  checks.push('service-listener-removers')

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
  await rejected('Pedometer.getStepCount', () =>
    One.Pedometer.getStepCount(new Date(0), new Date(1000))
  )
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
  await rejected(
    'LiveActivities.start',
    () => One.LiveActivities.start('One', { status: 'proof', value: 'absent' }),
    One.platform === 'android'
      ? 'LiveActivities.start requires an iOS native build'
      : undefined
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
