// typed native.app manifest inside the existing one vite options.
// name is the native target and appregistry key. one canonical definition:
// one/native re-exports it for apps and vxrn prebuild consumes it, so a new
// field is added once, here.
// a property list value, for the ios keys native.app does not model.
export type PlistValue =
  | string
  | number
  | boolean
  | PlistValue[]
  | { [key: string]: PlistValue }

export interface NativeAppManifest {
  name: string
  displayName?: string
  scheme?: string | string[]
  version?: string
  // the phone orientations the app supports, as expo's `orientation`:
  // portrait or landscape pairs, or all four for default. unset keeps the
  // template's portrait-only phone. the ipad list is never narrowed.
  orientation?: 'portrait' | 'landscape' | 'default'
  // light or dark locks the app's appearance; automatic, like unset, follows
  // the system. expo treats unset as light.
  userInterfaceStyle?: 'light' | 'dark' | 'automatic'
  icon?: {
    source: string
    backgroundColor: string
  }
  splash?: {
    source: string
    backgroundColor: string
    width?: number
    // contain (default) centers the artwork at width; cover fills the ios
    // launch screen with it, as expo's resizeMode does. android's system
    // splash shows the centered artwork either way.
    resizeMode?: 'contain' | 'cover'
    // a full-bleed image (a gradient, a texture) under the artwork on the ios
    // launch screen. android's system splash has only a color.
    backgroundImage?: string
    // what a dark-appearance launch shows, as expo's splash.dark: its own
    // background, and optionally its own artwork and background image.
    dark?: {
      source?: string
      backgroundColor: string
      backgroundImage?: string
    }
  }
  // project-relative .ttf or .otf files bundled into the binary, as the
  // expo-font plugin's `fonts`: ios lists them in UIAppFonts, android loads
  // them from assets/fonts. the family name is the file's own.
  fonts?: string[]
  imagePicker?: {
    // ios camera usage description shown at the system prompt. setting it
    // also declares the android camera permission; both are required for
    // One.ImagePicker.launchCamera.
    camera?: string
  }
  // photos permissions for saving and browsing through one.ios.photolibrary.
  photoLibrary?: {
    addOnly?: string
    readWrite?: string
  }
  // ios Contacts permission prompt for One.iOS.Contacts.
  contacts?: {
    usage: string
  }
  // full EventKit access for calendar events and reminders.
  calendar?: {
    usage?: string
    remindersUsage?: string
  }
  // foreground Core Location permission prompt for One.iOS.Location.
  location?: {
    whenInUse: string
  }
  // microphone prompt and background playback for One.iOS.Audio.
  audio?: {
    microphone?: string
    background?: boolean
  }
  // usage descriptions for One.Speech dictation, shown at the ios speech
  // recognition and microphone prompts. setting them also declares the
  // android RECORD_AUDIO permission.
  speech?: {
    recognition: string
    microphone: string
  }
  // present when the app uses local notifications. prebuild stamps the
  // android notification permissions and receiver plus the ios delegate gate.
  // push opts into remote push: the fcm source set and the aps-environment
  // entitlement. without it firebase stays out of the app entirely.
  notifications?: {
    push?: boolean
    // the push entitlement's apns environment, development by default. a
    // build signed for testflight or the app store sends through production.
    apsEnvironment?: 'development' | 'production'
  }
  // One.UI.PictureInPicture: stamps the ios audio background mode (pip opens
  // only for a playback session) and android's supportsPictureInPicture.
  pictureInPicture?: boolean
  // One.Updates over-the-air updates. prebuild points the release bundle at
  // the launcher, stamps the url and runtime version into the binary, and
  // writes the embedded manifest beside the release bundle. without url the
  // build launches its embedded bundle with updates disabled.
  updates?: {
    url?: string
    runtimeVersion: string
  }
  ios?: {
    bundleId: string
    buildNumber?: string
    tablet?: boolean
    deploymentTarget?: string
    screensGamma?: boolean
    useFrameworks?: 'static' | 'dynamic'
    ccache?: boolean
    usesNonExemptEncryption?: boolean
    // the tint the system gives the app's controls, tab selection and text
    // cursor, as xcode's AccentColor asset; js reads PlatformColor('AccentColor').
    accentColor?: {
      light: string
      dark?: string
    }
    // system prompt text for Face ID through One.iOS.LocalAuthentication.
    faceIdUsageDescription?: string
    // exposes the app's Documents in the Files app and document pickers.
    fileSharing?: boolean
    // universal links and shared web credentials, as entitlement entries
    // such as `applinks:example.com`.
    associatedDomains?: string[]
    // the sign in with apple entitlement, for One.iOS.AppleAuthentication.
    usesAppleSignIn?: boolean
    // a firebase GoogleService-Info.plist, bundled into the app as expo's
    // ios.googleServicesFile does.
    googleServicesFile?: string
    // Info.plist and entitlement keys native.app does not model (a tracking
    // prompt, an sdk's key). a key native.app or the template already writes
    // is rejected: set it through its field instead.
    infoPlist?: Record<string, PlistValue>
    entitlements?: Record<string, PlistValue>
    widgets?: {
      appGroup: string
      kind: string
      displayName: string
      description: string
      pushNotifications?: boolean
    }
  }
  android?: {
    applicationId: string
    versionCode?: number
    minSdk?: number
    // the android 8+ launcher icon. foreground is a 108dp square image whose
    // artwork sits inside the central 66dp the launcher mask keeps; the
    // background is an image or a color (white when neither is set, as expo);
    // monochrome is the android 13 themed icon.
    adaptiveIcon?: {
      foreground: string
      background?: string
      backgroundColor?: string
      monochrome?: string
    }
    targetSdk?: number
    compileSdk?: number
    // release builds run R8, as expo-build-properties' minify; shrinkResources
    // also drops unused resources and needs minify. proguardRules are appended
    // to the app's proguard-rules.pro.
    minify?: boolean
    shrinkResources?: boolean
    proguardRules?: string
    // extra manifest permissions: a bare name means android.permission.<name>.
    // blocked ones are removed even when a library's manifest merges them in.
    permissions?: string[]
    blockedPermissions?: string[]
    // a firebase google-services.json; prebuild applies the google-services
    // gradle plugin, as expo's android.googleServicesFile does.
    googleServicesFile?: string
    // verified https app links routed to the app (android:autoVerify).
    appLinks?: Array<{ host: string; pathPrefix?: string }>
    // google maps api key for One.UI.Map. setting it compiles the maps sdk
    // into the app and stamps the key meta-data; without it the maps source
    // set stays out and mounting One.UI.Map throws.
    googleMapsApiKey?: string
  }
}

const TARGET_NAME = /^[A-Za-z][A-Za-z0-9_]*$/
const SCHEME = /^[a-z][a-z0-9+.-]*$/i
const VERSION = /^\d+\.\d+\.\d+/
const BUILD_NUMBER = /^[A-Za-z0-9.]+$/
const REVERSE_DNS = /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/
const DEPLOYMENT_TARGET = /^\d+\.\d+$/
const HEX_COLOR = /^#[\da-f]{6}$/i
const FONT_FILE = /\.(ttf|otf)$/i
const ORIENTATIONS = ['portrait', 'landscape', 'default'] as const
const USER_INTERFACE_STYLES = ['light', 'dark', 'automatic'] as const

function fail(message: string): never {
  throw new Error(`[one] invalid native.app: ${message}`)
}

// platform scopes the platform-id requirement: an ios prebuild skips the
// android requirement and vice versa. without it both are required, because
// a manifest without platform ids prebuilds nothing.
export function validateNativeApp(
  manifest: NativeAppManifest,
  platform?: 'ios' | 'android' | string
): NativeAppManifest {
  if (!manifest || typeof manifest !== 'object') fail('manifest must be an object')
  if (!manifest.name || typeof manifest.name !== 'string') fail('name is required')
  if (!TARGET_NAME.test(manifest.name)) {
    fail(
      `name "${manifest.name}" must start with a letter and contain only letters, digits, and underscore`
    )
  }
  const schemes =
    manifest.scheme === undefined
      ? []
      : Array.isArray(manifest.scheme)
        ? manifest.scheme
        : [manifest.scheme]
  for (const scheme of schemes) {
    if (typeof scheme !== 'string' || !SCHEME.test(scheme)) {
      fail(`scheme "${scheme}" must be a valid uri scheme`)
    }
  }
  if (
    manifest.orientation !== undefined &&
    !ORIENTATIONS.includes(manifest.orientation)
  ) {
    fail(`orientation "${manifest.orientation}" must be ${ORIENTATIONS.join(', ')}`)
  }
  if (
    manifest.userInterfaceStyle !== undefined &&
    !USER_INTERFACE_STYLES.includes(manifest.userInterfaceStyle)
  ) {
    fail(
      `userInterfaceStyle "${manifest.userInterfaceStyle}" must be ${USER_INTERFACE_STYLES.join(', ')}`
    )
  }
  if (manifest.fonts !== undefined) {
    const names = new Set<string>()
    for (const font of manifest.fonts) {
      if (typeof font !== 'string' || !FONT_FILE.test(font)) {
        fail(`fonts entry "${font}" must be a .ttf or .otf file path`)
      }
      const name = font.split('/').pop() ?? font
      if (names.has(name)) fail(`fonts lists ${name} twice`)
      names.add(name)
    }
  }
  if (manifest.version !== undefined && !VERSION.test(manifest.version)) {
    fail(`version "${manifest.version}" must start with major.minor.patch`)
  }
  if (
    manifest.icon !== undefined &&
    (!manifest.icon.source || !HEX_COLOR.test(manifest.icon.backgroundColor))
  ) {
    fail('icon requires source and a six-digit hex backgroundColor')
  }
  if (
    manifest.splash !== undefined &&
    (!manifest.splash.source ||
      !HEX_COLOR.test(manifest.splash.backgroundColor) ||
      (manifest.splash.width !== undefined &&
        (!Number.isFinite(manifest.splash.width) ||
          manifest.splash.width < 1 ||
          manifest.splash.width > 288)))
  ) {
    fail(
      'splash requires source, a six-digit hex backgroundColor, and width from 1 to 288'
    )
  }
  if (
    manifest.splash?.dark !== undefined &&
    !HEX_COLOR.test(manifest.splash.dark.backgroundColor)
  ) {
    fail('splash.dark requires a six-digit hex backgroundColor')
  }
  if (
    manifest.splash?.dark?.backgroundImage !== undefined &&
    manifest.splash.backgroundImage === undefined
  ) {
    fail('splash.dark.backgroundImage needs splash.backgroundImage for the light launch')
  }
  if (
    manifest.splash?.resizeMode !== undefined &&
    manifest.splash.resizeMode !== 'contain' &&
    manifest.splash.resizeMode !== 'cover'
  ) {
    fail(`splash.resizeMode "${manifest.splash.resizeMode}" must be contain or cover`)
  }
  if (
    manifest.imagePicker?.camera !== undefined &&
    (typeof manifest.imagePicker.camera !== 'string' ||
      manifest.imagePicker.camera.trim() === '')
  ) {
    fail('imagePicker.camera must be a non-empty string')
  }
  if (
    manifest.photoLibrary !== undefined &&
    (!manifest.photoLibrary ||
      (manifest.photoLibrary.addOnly === undefined &&
        manifest.photoLibrary.readWrite === undefined))
  ) {
    fail('photoLibrary must configure addOnly or readWrite')
  }
  if (
    manifest.photoLibrary?.addOnly !== undefined &&
    (typeof manifest.photoLibrary.addOnly !== 'string' ||
      manifest.photoLibrary.addOnly.trim() === '')
  ) {
    fail('photoLibrary.addOnly must be a non-empty string')
  }
  if (
    manifest.photoLibrary?.readWrite !== undefined &&
    (typeof manifest.photoLibrary.readWrite !== 'string' ||
      manifest.photoLibrary.readWrite.trim() === '')
  ) {
    fail('photoLibrary.readWrite must be a non-empty string')
  }
  if (
    manifest.contacts !== undefined &&
    (!manifest.contacts ||
      typeof manifest.contacts.usage !== 'string' ||
      manifest.contacts.usage.trim() === '')
  ) {
    fail('contacts.usage must be a non-empty string')
  }
  if (manifest.calendar !== undefined) {
    if (!manifest.calendar ||
      (manifest.calendar.usage === undefined && manifest.calendar.remindersUsage === undefined)) {
      fail('calendar.usage or calendar.remindersUsage must be a non-empty string')
    }
    if (manifest.calendar.usage !== undefined &&
      (typeof manifest.calendar.usage !== 'string' || manifest.calendar.usage.trim() === '')) {
      fail('calendar.usage must be a non-empty string')
    }
    if (manifest.calendar.remindersUsage !== undefined &&
      (typeof manifest.calendar.remindersUsage !== 'string' ||
        manifest.calendar.remindersUsage.trim() === '')) {
      fail('calendar.remindersUsage must be a non-empty string')
    }
  }
  if (
    manifest.location !== undefined &&
    (!manifest.location ||
      typeof manifest.location.whenInUse !== 'string' ||
      manifest.location.whenInUse.trim() === '')
  ) {
    fail('location.whenInUse must be a non-empty string')
  }
  if (manifest.audio !== undefined) {
    if (!manifest.audio || typeof manifest.audio !== 'object') {
      fail('audio must configure microphone or background playback')
    }
    if (
      manifest.audio.microphone !== undefined &&
      (typeof manifest.audio.microphone !== 'string' || manifest.audio.microphone.trim() === '')
    ) {
      fail('audio.microphone must be a non-empty string')
    }
    if (
      manifest.audio.background !== undefined &&
      typeof manifest.audio.background !== 'boolean'
    ) {
      fail('audio.background must be a boolean')
    }
    if (manifest.audio.microphone === undefined && manifest.audio.background !== true) {
      fail('audio must configure microphone or background playback')
    }
  }
  if (
    manifest.ios?.faceIdUsageDescription !== undefined &&
    (typeof manifest.ios.faceIdUsageDescription !== 'string' ||
      manifest.ios.faceIdUsageDescription.trim() === '')
  ) {
    fail('ios.faceIdUsageDescription must be a non-empty string')
  }
  if (
    manifest.speech !== undefined &&
    (typeof manifest.speech?.recognition !== 'string' ||
      manifest.speech.recognition.trim() === '' ||
      typeof manifest.speech.microphone !== 'string' ||
      manifest.speech.microphone.trim() === '')
  ) {
    fail('speech.recognition and speech.microphone must be non-empty strings')
  }
  if (manifest.notifications !== undefined) {
    if (
      typeof manifest.notifications !== 'object' ||
      (manifest.notifications.push !== undefined &&
        typeof manifest.notifications.push !== 'boolean')
    ) {
      fail('notifications.push must be a boolean')
    }
    const aps = manifest.notifications.apsEnvironment
    if (aps !== undefined && aps !== 'development' && aps !== 'production') {
      fail(`notifications.apsEnvironment "${aps}" must be development or production`)
    }
    if (aps !== undefined && !manifest.notifications.push) {
      fail('notifications.apsEnvironment needs notifications.push')
    }
  }
  const accent = manifest.ios?.accentColor
  if (
    accent !== undefined &&
    (!HEX_COLOR.test(accent.light) ||
      (accent.dark !== undefined && !HEX_COLOR.test(accent.dark)))
  ) {
    fail('ios.accentColor light and dark must be six-digit hex colors')
  }
  if (
    manifest.pictureInPicture !== undefined &&
    typeof manifest.pictureInPicture !== 'boolean'
  ) {
    fail('pictureInPicture must be a boolean')
  }
  if (manifest.updates !== undefined) {
    if (
      typeof manifest.updates.runtimeVersion !== 'string' ||
      manifest.updates.runtimeVersion.trim() === ''
    ) {
      fail('updates.runtimeVersion must be a non-empty string')
    }
    if (
      manifest.updates.url !== undefined &&
      (typeof manifest.updates.url !== 'string' || manifest.updates.url.trim() === '')
    ) {
      fail('updates.url must be a non-empty string')
    }
  }
  if (!platform || platform === 'ios') {
    if (!manifest.ios?.bundleId || !REVERSE_DNS.test(manifest.ios.bundleId)) {
      fail(`ios.bundleId "${manifest.ios?.bundleId}" must be reverse-dns`)
    }
    if (
      manifest.ios.deploymentTarget !== undefined &&
      !DEPLOYMENT_TARGET.test(manifest.ios.deploymentTarget)
    ) {
      fail(
        `ios.deploymentTarget "${manifest.ios.deploymentTarget}" must look like "17.0"`
      )
    }
    if (
      manifest.ios.buildNumber !== undefined &&
      !BUILD_NUMBER.test(manifest.ios.buildNumber)
    ) {
      fail(
        `ios.buildNumber "${manifest.ios.buildNumber}" must contain only letters, digits, and dots`
      )
    }
    const widgets = manifest.ios.widgets
    if (widgets) {
      if (!manifest.ios.deploymentTarget || Number(manifest.ios.deploymentTarget) < 17) {
        fail('ios.widgets requires ios.deploymentTarget of 17.0 or newer')
      }
      if (
        !/^group\.[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/.test(widgets.appGroup)
      ) {
        fail('ios.widgets.appGroup must be a reverse-dns App Group beginning with group.')
      }
      if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(widgets.kind)) {
        fail('ios.widgets.kind must be a non-empty WidgetKit kind')
      }
      if (!widgets.displayName?.trim() || !widgets.description?.trim()) {
        fail('ios.widgets.displayName and description must be non-empty strings')
      }
      if (
        widgets.pushNotifications !== undefined &&
        typeof widgets.pushNotifications !== 'boolean'
      ) {
        fail('ios.widgets.pushNotifications must be a boolean')
      }
    }
  }
  if (!platform || platform === 'android') {
    if (
      !manifest.android?.applicationId ||
      !REVERSE_DNS.test(manifest.android.applicationId)
    ) {
      fail(
        `android.applicationId "${manifest.android?.applicationId}" must be reverse-dns`
      )
    }
    if (
      manifest.android.minSdk !== undefined &&
      (!Number.isInteger(manifest.android.minSdk) ||
        manifest.android.minSdk < 21 ||
        manifest.android.minSdk > 36)
    ) {
      fail(`android.minSdk "${manifest.android.minSdk}" must be an integer from 21 to 36`)
    }
    if (
      manifest.android.versionCode !== undefined &&
      (!Number.isInteger(manifest.android.versionCode) ||
        manifest.android.versionCode < 1)
    ) {
      fail(
        `android.versionCode "${manifest.android.versionCode}" must be a positive integer`
      )
    }
    for (const key of ['targetSdk', 'compileSdk'] as const) {
      const value = manifest.android[key]
      if (value !== undefined && (!Number.isInteger(value) || value < 21)) {
        fail(`android.${key} "${value}" must be an api level integer`)
      }
    }
    if (manifest.android.shrinkResources && !manifest.android.minify) {
      fail('android.shrinkResources needs android.minify')
    }
    for (const link of manifest.android.appLinks ?? []) {
      if (!link.host || !REVERSE_DNS.test(link.host)) {
        fail(`android.appLinks host "${link.host}" must be a domain`)
      }
      if (link.pathPrefix !== undefined && !link.pathPrefix.startsWith('/')) {
        fail(`android.appLinks pathPrefix "${link.pathPrefix}" must start with /`)
      }
    }
    const adaptiveIcon = manifest.android.adaptiveIcon
    if (
      adaptiveIcon !== undefined &&
      (!adaptiveIcon.foreground ||
        (adaptiveIcon.backgroundColor !== undefined &&
          !HEX_COLOR.test(adaptiveIcon.backgroundColor)))
    ) {
      fail(
        'android.adaptiveIcon requires foreground, and backgroundColor must be six-digit hex'
      )
    }
    if (
      manifest.android.googleMapsApiKey !== undefined &&
      (typeof manifest.android.googleMapsApiKey !== 'string' ||
        manifest.android.googleMapsApiKey.trim() === '')
    ) {
      fail('android.googleMapsApiKey must be a non-empty string')
    }
  }
  return manifest
}

// the expo config shape the dev server's manifest carries (`extra.expoClient`)
// for an app that declares native.app and no expo: clients that read an app's
// name, scheme or splash from the manifest read a one app the same way.
export function expoClientFromNativeApp(app: NativeAppManifest) {
  return {
    name: app.displayName ?? app.name,
    slug: app.name,
    scheme: app.scheme,
    version: app.version,
    orientation: app.orientation,
    // an expo config without the key means light, while prebuild writes no
    // UIUserInterfaceStyle for an unset style and the app follows the system,
    // so the manifest states the style the built app has.
    userInterfaceStyle: app.userInterfaceStyle ?? 'automatic',
    icon: app.icon?.source,
    splash: app.splash && {
      image: app.splash.source,
      backgroundColor: app.splash.backgroundColor,
      imageWidth: app.splash.width,
      resizeMode: app.splash.resizeMode,
      dark: app.splash.dark && {
        image: app.splash.dark.source,
        backgroundColor: app.splash.dark.backgroundColor,
      },
    },
    plugins: app.fonts?.length ? [['expo-font', { fonts: app.fonts }]] : undefined,
    ios: app.ios && {
      bundleIdentifier: app.ios.bundleId,
      buildNumber: app.ios.buildNumber,
      supportsTablet: app.ios.tablet,
      associatedDomains: app.ios.associatedDomains,
      usesAppleSignIn: app.ios.usesAppleSignIn,
      googleServicesFile: app.ios.googleServicesFile,
      infoPlist: app.ios.infoPlist,
      entitlements: app.ios.entitlements,
    },
    android: app.android && {
      package: app.android.applicationId,
      versionCode: app.android.versionCode,
      permissions: app.android.permissions,
      blockedPermissions: app.android.blockedPermissions,
      googleServicesFile: app.android.googleServicesFile,
      adaptiveIcon: app.android.adaptiveIcon && {
        foregroundImage: app.android.adaptiveIcon.foreground,
        backgroundImage: app.android.adaptiveIcon.background,
        backgroundColor: app.android.adaptiveIcon.backgroundColor,
        monochromeImage: app.android.adaptiveIcon.monochrome,
      },
    },
  }
}
