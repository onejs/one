import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import module from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  validateNativeApp,
  type NativeAppManifest,
  type PlistValue,
} from '@vxrn/utils/nativeAppManifest'
import FSExtra from 'fs-extra'
import sharp from 'sharp'
import { swiftPackageDirectories } from '../utils/swiftPackageId'

type NativeProjectPatches = {
  ONE_NOTIFICATIONS: {
    enabledInfoPlistKey: string
    pushInfoPlistKey: string
    apsEnvironment: string
    androidPermissions: string[]
    receiver: string
    receiverAction: string
    pushService: string
    pushServiceAction: string
    pushGradleProperty: string
  }
  ONE_UPDATES: {
    urlInfoPlistKey: string
    runtimeVersionInfoPlistKey: string
    bridgingHeaderImport: string
  }
  pointReleaseBundleURLAtOneUpdates(appDelegate: string): string
  ONE_LAUNCH_SCREEN: { bridgingHeaderImport: string }
  holdLaunchScreenOverRootView(appDelegate: string): string
  holdLaunchScreenInMainActivity(mainActivity: string): string
  addSetCliPathToBundleReactNativeShellScript(input: string): string
  addPodHermescToBundleReactNativeShellScript(input: string): string
  addDepsPatchToBundleReactNativeShellScript(input: string): string
  addEmbeddedUpdatesManifestToBundleReactNativeShellScript(
    input: string,
    runtimeVersion: string
  ): string
  injectFmtCxx17FixIntoPodfile(input: string): string
  injectOneSwiftPackagesIntoPodfile(input: string): string
  injectHermesMinificationPatchIntoPodfile(input: string): string
  injectReactNativeScreensGammaIntoPodfile(input: string): string
  hasNitroWebImage(root: string): boolean
  injectNitroWebImageModularHeaderIntoPodfile(input: string): string
  replaceAppBuildGradleReactBlock(input: string): string
  addDepsPatchToAppBuildGradle(input: string): string
  addReactNativeScreensFix(input: string): string
}

const nativeProjectPatches = module.createRequire(import.meta.url)(
  '../../native-project-patches.cjs'
) as NativeProjectPatches
const notificationsHost = nativeProjectPatches.ONE_NOTIFICATIONS
const updatesHost = nativeProjectPatches.ONE_UPDATES

/*
This code block is partially copied from meta owned repos.
Copyright (c) Facebook, Inc. and its affiliates.
*/

const PORTRAIT_ORIENTATIONS = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationPortraitUpsideDown',
]
const LANDSCAPE_ORIENTATIONS = [
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
]

// the manifest is one({ native: { app } }), defined once in @vxrn/utils. the
// one cli validates the full manifest before passing it here; vxrn
// re-validates through the same definition so direct callers fail before
// touching either project.
export type { NativeAppManifest as PrebuildAppConfig } from '@vxrn/utils/nativeAppManifest'

export const validatePrebuildApp = validateNativeApp

const ANDROID_DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
} as const

const IOS_BUNDLE_PLACEHOLDER =
  'org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)'
const ANDROID_PACKAGE_PLACEHOLDER = 'com.helloworld'
const ANDROID_PACKAGE_PATH = 'com/helloworld'

function patchIosBundlePhase(project: string, updatesRuntimeVersion?: string): string {
  let patchedBundlePhases = 0
  const patchedProject = project.replace(
    /shellScript = ("(?:\\.|[^"\\])*");/g,
    (assignment, serializedScript: string) => {
      let script: unknown
      try {
        script = JSON.parse(serializedScript)
      } catch {
        return assignment
      }
      if (typeof script !== 'string' || !script.includes('react-native-xcode.sh')) {
        return assignment
      }

      let patched = script
      patched = nativeProjectPatches.addSetCliPathToBundleReactNativeShellScript(patched)
      patched = nativeProjectPatches.addPodHermescToBundleReactNativeShellScript(patched)
      patched = nativeProjectPatches.addDepsPatchToBundleReactNativeShellScript(patched)
      if (
        !patched.includes('[vxrn/one] React Native now defaults CLI_PATH') ||
        !patched.includes('[vxrn/one] use the hermes-engine pod') ||
        !patched.includes('[vxrn/one] ensure patches are applied')
      ) {
        throw new Error('[vxrn] failed to apply required iOS bundle phase patches')
      }
      if (updatesRuntimeVersion !== undefined) {
        patched =
          nativeProjectPatches.addEmbeddedUpdatesManifestToBundleReactNativeShellScript(
            patched,
            updatesRuntimeVersion
          )
        if (
          !patched.includes(
            '[vxrn/one] the embedded update manifest lands beside the release bundle'
          )
        ) {
          throw new Error('[vxrn] failed to apply the iOS embedded updates manifest patch')
        }
      }
      patchedBundlePhases++
      return `shellScript = ${JSON.stringify(patched)};`
    }
  )

  if (patchedBundlePhases !== 1) {
    throw new Error(
      `[vxrn] expected one iOS React Native bundle phase, found ${patchedBundlePhases}`
    )
  }
  return patchedProject
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// uiscene adoption for the xcode 27 sdk: an app built with sdk 27 must
// declare a scene manifest or it fails to launch on ios 27 ("UIScene life
// cycle is required for apps built with this SDK"). prebuild therefore
// always renders the scene manifest, a SceneDelegate that owns the window
// and the RN root, and a trimmed AppDelegate. no toggle: the scene path is
// the only path, on every ios version prebuild supports.
const SCENE_DELEGATE_FILE_REF_ID = '1A2B3C4D5E6F7A8B9C0D1E2F'
const SCENE_DELEGATE_BUILD_FILE_ID = '2B3C4D5E6F7A8B9C0D1E2F1A'
const PUSH_ENTITLEMENTS_FILE_REF_ID = '3C4D5E6F7A8B9C0D1E2F1A2B'

export function renderSceneDelegateSwift(appName: string): string {
  return `import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

// owns the window and the react native root. with a scene manifest the
// system creates this delegate per foreground scene instead of asking the
// app delegate for a window, which is what the xcode 27 sdk requires.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    // cold-start links arrive in connectionOptions under scenes, never in
    // the app launchOptions, so they are translated into the launchOptions
    // shape RCTLinkingManager.getInitialURL reads.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let activity = connectionOptions.userActivities.first(where: {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }) {
      launchOptions[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ]
    }

    factory.startReactNative(
      withModuleName: "${appName}",
      in: window,
      launchOptions: launchOptions
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`
}

function insertAfterLine(haystack: string, anchor: string, insertion: string): string {
  const anchorIndex = haystack.indexOf(anchor)
  if (anchorIndex === -1) return haystack
  const lineEnd = haystack.indexOf('\n', anchorIndex)
  if (lineEnd === -1) return `${haystack}\n${insertion}`
  return `${haystack.slice(0, lineEnd + 1)}${insertion}\n${haystack.slice(lineEnd + 1)}`
}

function patchIosInfoPlistSceneManifest(rendered: string): string {
  const anchor = '\t<key>LSRequiresIPhoneOS</key>'
  if (!rendered.includes(anchor)) {
    throw new Error(
      '[vxrn] prebuild template Info.plist lost its LSRequiresIPhoneOS anchor'
    )
  }
  return rendered.replace(
    anchor,
    `\t<key>UIApplicationSceneManifest</key>
\t<dict>
\t\t<key>UIApplicationSupportsMultipleScenes</key>
\t\t<false/>
\t\t<key>UISceneConfigurations</key>
\t\t<dict>
\t\t\t<key>UIWindowSceneSessionRoleApplication</key>
\t\t\t<array>
\t\t\t\t<dict>
\t\t\t\t\t<key>UISceneConfigurationName</key>
\t\t\t\t\t<string>Default Configuration</string>
\t\t\t\t\t<key>UISceneDelegateClassName</key>
\t\t\t\t\t<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
\t\t\t\t</dict>
\t\t\t</array>
\t\t</dict>
\t</dict>
${anchor}`
  )
}

function patchIosAppDelegateSceneLifecycle(
  rendered: string,
  appName: string,
  backgroundTasks: boolean,
  appIntents: boolean
): string {
  const anchor = `@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "${appName}",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}`
  if (!rendered.includes(anchor)) {
    throw new Error(
      '[vxrn] prebuild template AppDelegate.swift changed shape: cannot move the RN root to the scene delegate'
    )
  }
  return rendered.replace(
    anchor,
    `@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory
${backgroundTasks ? `    OneBackgroundTasksRegisterHost(factory, launchOptions)
` : ''}${appIntents ? `    OneAppIntentsRegisterHost(factory, launchOptions)
` : ''}    return true
  }
}`
  )
}

const ONE_BRIDGING_HEADER_NAME = 'One-Bridging-Header.h'

function renderOneBridgingHeader(app: NativeAppManifest): string {
  const imports = [nativeProjectPatches.ONE_LAUNCH_SCREEN.bridgingHeaderImport]
  if (app.updates !== undefined) imports.push(updatesHost.bridgingHeaderImport)
  if (app.ios?.backgroundTasks !== undefined) imports.push('#import "OneBackgroundTasksBridge.h"')
  if (app.ios?.appIntents !== undefined) imports.push('#import "OneAppIntentsBridge.h"')
  return `// generated by one prebuild: exposes One's c entry points to AppDelegate
// without importing the One module.
${imports.join('\n')}
`
}

function generateOneBridgingHeader(dest: string, app: NativeAppManifest): void {
  FSExtra.writeFileSync(
    path.join(dest, app.name, ONE_BRIDGING_HEADER_NAME),
    renderOneBridgingHeader(app)
  )
}

function patchIosPbxprojOneBridgingHeader(project: string, appName: string): string {
  // both app-target configurations point at the generated bridging header.
  // the anchor is the app plist, which only those two settings own.
  const anchor = `INFOPLIST_FILE = ${appName}/Info.plist;`
  const setting = `SWIFT_OBJC_BRIDGING_HEADER = "${appName}/${ONE_BRIDGING_HEADER_NAME}";`
  const occurrences = project.split(anchor).length - 1
  if (occurrences !== 2) {
    throw new Error(
      '[vxrn] prebuild template project.pbxproj changed shape: cannot point the app target at the One bridging header'
    )
  }
  return project
    .split(anchor)
    .join(`${anchor}\n\t\t\t\t${setting}`)
}

function patchIosPbxprojSceneDelegate(rendered: string, appName: string): string {
  const edits: Array<[string, string]> = [
    [
      '/* AppDelegate.swift in Sources */ = {isa = PBXBuildFile;',
      `\t\t${SCENE_DELEGATE_BUILD_FILE_ID} /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${SCENE_DELEGATE_FILE_REF_ID} /* SceneDelegate.swift */; };`,
    ],
    [
      '/* AppDelegate.swift */ = {isa = PBXFileReference;',
      `\t\t${SCENE_DELEGATE_FILE_REF_ID} /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = SceneDelegate.swift; path = ${appName}/SceneDelegate.swift; sourceTree = "<group>"; };`,
    ],
    [
      '/* AppDelegate.swift */,',
      `\t\t\t\t${SCENE_DELEGATE_FILE_REF_ID} /* SceneDelegate.swift */,`,
    ],
    [
      '/* AppDelegate.swift in Sources */,',
      `\t\t\t\t${SCENE_DELEGATE_BUILD_FILE_ID} /* SceneDelegate.swift in Sources */,`,
    ],
  ]
  let patched = rendered
  for (const [anchor, insertion] of edits) {
    const next = insertAfterLine(patched, anchor, insertion)
    if (next === patched) {
      throw new Error(
        `[vxrn] prebuild template project.pbxproj lost its AppDelegate.swift anchor (${anchor})`
      )
    }
    patched = next
  }
  return patched
}

function patchIosPbxprojAppIntents(rendered: string, appName: string): string {
  const name = 'OneAppIntents.swift'
  const fileRef = pbxprojId('one-app-intents-file')
  const buildFile = pbxprojId('one-app-intents-build')
  const edits: Array<[string, string]> = [
    [
      '/* AppDelegate.swift in Sources */ = {isa = PBXBuildFile;',
      `\t\t${buildFile} /* ${name} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRef} /* ${name} */; };`,
    ],
    [
      '/* AppDelegate.swift */ = {isa = PBXFileReference;',
      `\t\t${fileRef} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = ${name}; path = ${appName}/${name}; sourceTree = "<group>"; };`,
    ],
    ['/* AppDelegate.swift */,', `\t\t\t\t${fileRef} /* ${name} */,`],
    ['/* AppDelegate.swift in Sources */,', `\t\t\t\t${buildFile} /* ${name} in Sources */,`],
  ]
  let patched = rendered
  for (const [anchor, insertion] of edits) {
    const next = insertAfterLine(patched, anchor, insertion)
    if (next === patched) {
      throw new Error(`[vxrn] prebuild template project.pbxproj lost its AppDelegate.swift anchor (${anchor})`)
    }
    patched = next
  }
  return patched
}

function swiftLiteral(value: string): string {
  return JSON.stringify(value).replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) => `\\u{${hex}}`)
}

function swiftShortcutPhrase(value: string): string {
  return `"${value.split('{app}').map((part) => swiftLiteral(part).slice(1, -1)).join('\\(.applicationName)')}"`
}

export function renderIosAppIntentsSwift(actions: NonNullable<NonNullable<NativeAppManifest['ios']>['appIntents']>['actions']): string {
  const types = actions.map((action, index) => {
    const summaryTitle = swiftLiteral(action.title).slice(1, -1)
    const text = action.textParameterTitle === undefined ? '' : `
  @Parameter(title: ${swiftLiteral(action.textParameterTitle)}) var text: String

  static var parameterSummary: some ParameterSummary {
    Summary("${summaryTitle} \\(\\.$text)")
  }
`
    return `struct OneAppIntent${index}: AppIntent {
  static let title: LocalizedStringResource = ${swiftLiteral(action.title)}
${text}
  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let result = try await oneAppIntentsRun(${swiftLiteral(action.id)}, ${text ? 'text' : 'nil'})
    return .result(value: result)
  }
}`
  })
  const shortcuts = actions.map((action, index) => `    AppShortcut(
      intent: OneAppIntent${index}(),
      phrases: [${swiftShortcutPhrase(action.shortcutPhrase)}],
      shortTitle: ${swiftLiteral(action.title)},
      systemImageName: "bolt.fill"
    )`).join('\n')
  return `import AppIntents
import Foundation

private func oneAppIntentsRun(_ identifier: String, _ text: String?) async throws -> String {
  try await withCheckedThrowingContinuation { continuation in
    OneAppIntentsPerform(identifier, text) { result, error in
      if let error { continuation.resume(throwing: error) }
      else if let result { continuation.resume(returning: result) }
      else { continuation.resume(throwing: NSError(domain: "OneAppIntents", code: 3)) }
    }
  }
}

${types.join('\n\n')}

struct OneAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
${shortcuts}
  }
}
`
}

function fontFileName(font: string): string {
  return path.basename(font)
}

function pbxprojId(seed: string): string {
  return createHash('sha1').update(seed).digest('hex').slice(0, 24).toUpperCase()
}

const GOOGLE_SERVICES_PLIST = 'GoogleService-Info.plist'
const GOOGLE_SERVICES_VERSION = '4.4.4'

// the files prebuild bundles next to the ios app sources: native.app fonts and
// the firebase plist.
function iosResourceFiles(app: NativeAppManifest): string[] {
  return [
    ...(app.fonts ?? []).map(fontFileName),
    ...(app.ios?.googleServicesFile ? [GOOGLE_SERVICES_PLIST] : []),
  ]
}

// each bundled file becomes an app-group file in the Resources phase, the way
// expo's font and google services plugins add theirs.
function patchIosPbxprojResources(rendered: string, appName: string, names: string[]): string {
  let patched = rendered
  for (const name of names) {
    const fileRef = pbxprojId(`one-resource-file:${name}`)
    const buildFile = pbxprojId(`one-resource-build:${name}`)
    const fileType = name.endsWith('.plist') ? 'text.plist.xml' : 'file'
    const edits: Array<[string, string]> = [
      [
        '/* Images.xcassets in Resources */ = {isa = PBXBuildFile;',
        `\t\t${buildFile} /* ${name} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRef} /* ${name} */; };`,
      ],
      [
        '/* Images.xcassets */ = {isa = PBXFileReference;',
        `\t\t${fileRef} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = ${fileType}; name = ${name}; path = ${appName}/${name}; sourceTree = "<group>"; };`,
      ],
      ['/* Images.xcassets */,', `\t\t\t\t${fileRef} /* ${name} */,`],
      ['/* Images.xcassets in Resources */,', `\t\t\t\t${buildFile} /* ${name} in Resources */,`],
    ]
    for (const [anchor, insertion] of edits) {
      const next = insertAfterLine(patched, anchor, insertion)
      if (next === patched) {
        throw new Error(
          `[vxrn] prebuild template project.pbxproj lost its Images.xcassets anchor (${anchor})`
        )
      }
      patched = next
    }
  }
  return patched
}

// ios copies fonts and the firebase plist next to the app sources; android
// loads fonts from assets/fonts and the gradle plugin reads
// app/google-services.json.
function copyAppResources({
  root,
  dest,
  platform,
  app,
}: {
  root: string
  dest: string
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): void {
  const copies: Array<[string, string]> = (app.fonts ?? []).map((font) => [
    font,
    platform === 'ios'
      ? path.join(dest, app.name, fontFileName(font))
      : path.join(dest, 'app', 'src', 'main', 'assets', 'fonts', fontFileName(font)),
  ])
  const googleServices =
    platform === 'ios' ? app.ios?.googleServicesFile : app.android?.googleServicesFile
  if (googleServices) {
    copies.push([
      googleServices,
      platform === 'ios'
        ? path.join(dest, app.name, GOOGLE_SERVICES_PLIST)
        : path.join(dest, 'app', 'google-services.json'),
    ])
  }
  for (const [file, target] of copies) {
    const source = path.resolve(root, file)
    if (!FSExtra.existsSync(source)) {
      throw new Error(`[vxrn] native.app names ${file}, which does not exist`)
    }
    FSExtra.mkdirSync(path.dirname(target), { recursive: true })
    FSExtra.copyFileSync(source, target)
  }
}

function patchIosPbxprojAppEntitlements(rendered: string, appName: string): string {
  // the app entitlement file only when the app has an entitlement. the
  // community template ships no entitlements file, so this adds the file
  // reference plus the CODE_SIGN_ENTITLEMENTS setting on the app target.
  const edits: Array<[string, string]> = [
    [
      '/* AppDelegate.swift */ = {isa = PBXFileReference;',
      `\t\t${PUSH_ENTITLEMENTS_FILE_REF_ID} /* ${appName}.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; name = ${appName}.entitlements; path = ${appName}/${appName}.entitlements; sourceTree = "<group>"; };`,
    ],
    [
      '/* AppDelegate.swift */,',
      `\t\t\t\t${PUSH_ENTITLEMENTS_FILE_REF_ID} /* ${appName}.entitlements */,`,
    ],
  ]
  let patched = rendered
  for (const [anchor, insertion] of edits) {
    const next = insertAfterLine(patched, anchor, insertion)
    if (next === patched) {
      throw new Error(
        `[vxrn] prebuild template project.pbxproj lost its AppDelegate.swift anchor (${anchor})`
      )
    }
    patched = next
  }
  const setting = `PRODUCT_NAME = ${appName};`
  if (!patched.includes(setting)) {
    throw new Error(
      '[vxrn] prebuild template project.pbxproj lost its PRODUCT_NAME anchor'
    )
  }
  return patched
    .split(setting)
    .join(
      `${setting}\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = ${appName}/${appName}.entitlements;`
    )
}

function renderPlistValue(value: PlistValue, indent: string): string {
  if (typeof value === 'string') return `${indent}<string>${escapeXml(value)}</string>`
  if (typeof value === 'boolean') return `${indent}<${value}/>`
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? `${indent}<integer>${value}</integer>`
      : `${indent}<real>${value}</real>`
  }
  if (Array.isArray(value)) {
    return `${indent}<array>\n${value.map((item) => renderPlistValue(item, `${indent}\t`)).join('\n')}\n${indent}</array>`
  }
  return `${indent}<dict>\n${renderPlistEntries(value, `${indent}\t`)}\n${indent}</dict>`
}

function renderPlistEntries(entries: Record<string, PlistValue>, indent: string): string {
  return Object.entries(entries)
    .map(([key, value]) => `${indent}<key>${escapeXml(key)}</key>\n${renderPlistValue(value, indent)}`)
    .join('\n')
}

// every app-target entitlement in one file: push, the widget app group,
// associated domains, sign in with apple, then the app's own keys. a key the
// manifest already models cannot be set twice through ios.entitlements.
function appEntitlements(app: NativeAppManifest): Record<string, PlistValue> {
  const modeled: Record<string, PlistValue> = {}
  if (app.notifications?.push === true || app.ios?.widgets?.pushNotifications) {
    modeled['aps-environment'] =
      app.notifications?.apsEnvironment ?? notificationsHost.apsEnvironment
  }
  if (app.ios?.widgets) {
    modeled['com.apple.security.application-groups'] = [app.ios.widgets.appGroup]
  }
  if (app.ios?.associatedDomains?.length) {
    modeled['com.apple.developer.associated-domains'] = app.ios.associatedDomains
  }
  if (app.ios?.usesAppleSignIn) {
    modeled['com.apple.developer.applesignin'] = ['Default']
  }
  for (const key of Object.keys(app.ios?.entitlements ?? {})) {
    if (key in modeled) {
      throw new Error(
        `[vxrn] native.app.ios.entitlements sets ${key}, which native.app already writes: use its field`
      )
    }
  }
  return { ...modeled, ...app.ios?.entitlements }
}

function renderEntitlements(entries: Record<string, PlistValue>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${renderPlistEntries(entries, '\t')}
</dict>
</plist>
`
}

function patchAndroidMainApplicationUpdatesHost(rendered: string): string {
  // One's factory takes the same named arguments, so swapping the import
  // repoints the call site at the delegate that re-asks the launcher.
  const anchor = 'import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost'
  if (!rendered.includes(anchor)) {
    throw new Error(
      '[vxrn] prebuild template MainApplication.kt changed shape: cannot point the ReactHost at One.Updates'
    )
  }
  return rendered.replace(
    anchor,
    'import com.margelo.nitro.one.OneUpdatesReactHost.getDefaultReactHost'
  )
}

function escapeGradleString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function patchAndroidBuildGradleUpdatesManifest(
  rendered: string,
  runtimeVersion: string
): string {
  // every bundle task writes the embedded manifest into its own assets
  // output beside index.android.bundle, with an id and timestamp generated
  // at build time. the react block above was just replaced, so its
  // autolink call is the anchor.
  const anchor = '    autolinkLibrariesWithApp()\n}'
  if (!rendered.includes(anchor)) {
    throw new Error(
      '[vxrn] cannot stamp the embedded updates manifest: expected the replaced react block in app/build.gradle'
    )
  }
  const snippet = `${anchor}

// [vxrn/one] the embedded update manifest lands beside the release bundle
tasks.matching { it.name.startsWith("createBundle") && it.name.endsWith("JsAndAssets") }.configureEach { bundleTask ->
    // capture the output directory provider at configuration time, so the
    // action below holds no task reference at execution time.
    def bundleDir = bundleTask.jsBundleDir
    bundleTask.doLast {
        def manifestFile = new File(bundleDir.get().asFile, "one-updates-embedded.json")
        manifestFile.text = groovy.json.JsonOutput.toJson([
            id: java.util.UUID.randomUUID().toString(),
            createdAt: java.time.Instant.now().toString(),
            runtimeVersion: "${escapeGradleString(runtimeVersion)}",
        ])
    }
}`
  return rendered.replace(anchor, snippet)
}

function patchIosPbxprojWidgets(project: string, app: NativeAppManifest): string {
  const name = app.name
  const bundleId = app.ios!.bundleId
  const deploymentTarget = app.ios!.deploymentTarget || '17.0'
  const ids = {
    product: 'A10000000000000000000001',
    target: 'A10000000000000000000002',
    group: 'A10000000000000000000003',
    sources: 'A10000000000000000000004',
    resources: 'A10000000000000000000005',
    frameworks: 'A10000000000000000000006',
    embed: 'A10000000000000000000007',
    dependency: 'A10000000000000000000008',
    proxy: 'A10000000000000000000009',
    debug: 'A1000000000000000000000A',
    release: 'A1000000000000000000000B',
    config: 'A1000000000000000000000C',
    widgetSource: 'A1000000000000000000000D',
    contract: 'A1000000000000000000000E',
    plist: 'A1000000000000000000000F',
    entitlements: 'A10000000000000000000010',
    appEntitlements: 'A10000000000000000000011',
    bridgeSwift: 'A10000000000000000000012',
    bridgeObjc: 'A10000000000000000000013',
    widgetBuild: 'A10000000000000000000014',
    contractWidgetBuild: 'A10000000000000000000015',
    contractAppBuild: 'A10000000000000000000016',
    bridgeSwiftBuild: 'A10000000000000000000017',
    bridgeObjcBuild: 'A10000000000000000000018',
    embedBuild: 'A10000000000000000000019',
  }
  const insert = (anchor: string, value: string) => {
    if (!project.includes(anchor))
      throw new Error(`[vxrn] widget target template anchor missing: ${anchor}`)
    project = project.replace(anchor, `${value}\n${anchor}`)
  }
  insert(
    '/* End PBXBuildFile section */',
    `\t\t${ids.widgetBuild} /* OneWidget.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.widgetSource} /* OneWidget.swift */; };
\t\t${ids.contractWidgetBuild} /* OneWidgetContract.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.contract} /* OneWidgetContract.swift */; };
\t\t${ids.contractAppBuild} /* OneWidgetContract.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.contract} /* OneWidgetContract.swift */; };
\t\t${ids.bridgeSwiftBuild} /* OneWidgetsBridge.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.bridgeSwift} /* OneWidgetsBridge.swift */; };
\t\t${ids.bridgeObjcBuild} /* OneWidgetsBridge.m in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.bridgeObjc} /* OneWidgetsBridge.m */; };
\t\t${ids.embedBuild} /* OneWidgets.appex in Embed App Extensions */ = {isa = PBXBuildFile; fileRef = ${ids.product} /* OneWidgets.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };`
  )
  insert(
    '/* End PBXFileReference section */',
    `\t\t${ids.product} /* OneWidgets.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = OneWidgets.appex; sourceTree = BUILT_PRODUCTS_DIR; };
\t\t${ids.widgetSource} /* OneWidget.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = OneWidget.swift; sourceTree = "<group>"; };
\t\t${ids.contract} /* OneWidgetContract.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = OneWidgetContract.swift; path = ${name}/OneWidgetContract.swift; sourceTree = "<group>"; };
\t\t${ids.plist} /* WidgetInfo.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = WidgetInfo.plist; sourceTree = "<group>"; };
\t\t${ids.entitlements} /* OneWidgets.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = OneWidgets.entitlements; sourceTree = "<group>"; };
\t\t${ids.appEntitlements} /* OneAppWidgets.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; name = OneAppWidgets.entitlements; path = ${name}/OneAppWidgets.entitlements; sourceTree = "<group>"; };
\t\t${ids.bridgeSwift} /* OneWidgetsBridge.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = OneWidgetsBridge.swift; path = ${name}/OneWidgetsBridge.swift; sourceTree = "<group>"; };
\t\t${ids.bridgeObjc} /* OneWidgetsBridge.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; name = OneWidgetsBridge.m; path = ${name}/OneWidgetsBridge.m; sourceTree = "<group>"; };`
  )
  insert(
    '/* Begin PBXFrameworksBuildPhase section */',
    `/* Begin PBXCopyFilesBuildPhase section */
\t\t${ids.embed} /* Embed App Extensions */ = {isa = PBXCopyFilesBuildPhase; buildActionMask = 2147483647; dstPath = ""; dstSubfolderSpec = 13; files = (${ids.embedBuild} /* OneWidgets.appex in Embed App Extensions */, ); name = "Embed App Extensions"; runOnlyForDeploymentPostprocessing = 0; };
/* End PBXCopyFilesBuildPhase section */
`
  )
  insert(
    '/* End PBXFrameworksBuildPhase section */',
    `\t\t${ids.frameworks} /* Frameworks */ = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; };`
  )
  insert(
    '/* End PBXGroup section */',
    `\t\t${ids.group} /* OneWidgets */ = {isa = PBXGroup; children = (${ids.widgetSource} /* OneWidget.swift */, ${ids.plist} /* WidgetInfo.plist */, ${ids.entitlements} /* OneWidgets.entitlements */, ); path = OneWidgets; sourceTree = "<group>"; };`
  )
  insert(
    '/* End PBXNativeTarget section */',
    `\t\t${ids.target} /* OneWidgets */ = {isa = PBXNativeTarget; buildConfigurationList = ${ids.config} /* Build configuration list for PBXNativeTarget "OneWidgets" */; buildPhases = (${ids.sources} /* Sources */, ${ids.frameworks} /* Frameworks */, ${ids.resources} /* Resources */, ); buildRules = (); dependencies = (); name = OneWidgets; productName = OneWidgets; productReference = ${ids.product} /* OneWidgets.appex */; productType = "com.apple.product-type.app-extension"; };`
  )
  insert(
    '/* End PBXResourcesBuildPhase section */',
    `\t\t${ids.resources} /* Resources */ = {isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; };`
  )
  insert(
    '/* End PBXSourcesBuildPhase section */',
    `\t\t${ids.sources} /* Sources */ = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (${ids.widgetBuild} /* OneWidget.swift in Sources */, ${ids.contractWidgetBuild} /* OneWidgetContract.swift in Sources */, ); runOnlyForDeploymentPostprocessing = 0; };`
  )
  insert(
    '/* Begin XCBuildConfiguration section */',
    `/* Begin PBXContainerItemProxy section */
\t\t${ids.proxy} /* PBXContainerItemProxy */ = {isa = PBXContainerItemProxy; containerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */; proxyType = 1; remoteGlobalIDString = ${ids.target}; remoteInfo = OneWidgets; };
/* End PBXContainerItemProxy section */

/* Begin PBXTargetDependency section */
\t\t${ids.dependency} /* PBXTargetDependency */ = {isa = PBXTargetDependency; target = ${ids.target} /* OneWidgets */; targetProxy = ${ids.proxy} /* PBXContainerItemProxy */; };
/* End PBXTargetDependency section */
`
  )
  const config = (id: string, mode: string) =>
    `\t\t${id} /* ${mode} */ = {isa = XCBuildConfiguration; buildSettings = { CODE_SIGN_ENTITLEMENTS = OneWidgets/OneWidgets.entitlements; CODE_SIGN_STYLE = Automatic; CURRENT_PROJECT_VERSION = ${app.ios?.buildNumber || '1'}; GENERATE_INFOPLIST_FILE = NO; INFOPLIST_FILE = OneWidgets/WidgetInfo.plist; IPHONEOS_DEPLOYMENT_TARGET = ${deploymentTarget}; MARKETING_VERSION = "${app.version || '1.0'}"; PRODUCT_BUNDLE_IDENTIFIER = ${bundleId}.widgets; PRODUCT_NAME = "$(TARGET_NAME)"; SDKROOT = iphoneos; SKIP_INSTALL = YES; SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"; SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "${app.ios?.tablet ? '1,2' : '1'}"; }; name = ${mode}; };`
  insert(
    '/* End XCBuildConfiguration section */',
    `${config(ids.debug, 'Debug')}\n${config(ids.release, 'Release')}`
  )
  insert(
    '/* End XCConfigurationList section */',
    `\t\t${ids.config} /* Build configuration list for PBXNativeTarget "OneWidgets" */ = {isa = XCConfigurationList; buildConfigurations = (${ids.debug} /* Debug */, ${ids.release} /* Release */, ); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; };`
  )
  const one = (anchor: string, value: string) => {
    if (!project.includes(anchor))
      throw new Error(`[vxrn] widget target template anchor missing: ${anchor}`)
    project = project.replace(anchor, `${anchor}\n${value}`)
  }
  one(
    '13B07F961A680F5B00A75B9A /* ' + name + '.app */,',
    `\t\t\t\t${ids.product} /* OneWidgets.appex */,`
  )
  one(
    '13B07FAE1A68108700A75B9A /* ' + name + ' */,',
    `\t\t\t\t${ids.group} /* OneWidgets */,`
  )
  one(
    '761780EC2CA45674006654EE /* AppDelegate.swift */,',
    `\t\t\t\t${ids.contract} /* OneWidgetContract.swift */,\n\t\t\t\t${ids.appEntitlements} /* OneAppWidgets.entitlements */,\n\t\t\t\t${ids.bridgeSwift} /* OneWidgetsBridge.swift */,\n\t\t\t\t${ids.bridgeObjc} /* OneWidgetsBridge.m */,`
  )
  one(
    '761780ED2CA45674006654EE /* AppDelegate.swift in Sources */,',
    `\t\t\t\t${ids.contractAppBuild} /* OneWidgetContract.swift in Sources */,\n\t\t\t\t${ids.bridgeSwiftBuild} /* OneWidgetsBridge.swift in Sources */,\n\t\t\t\t${ids.bridgeObjcBuild} /* OneWidgetsBridge.m in Sources */,`
  )
  one(
    '13B07F861A680F5B00A75B9A /* ' + name + ' */,',
    `\t\t\t\t${ids.target} /* OneWidgets */,`
  )
  one(
    '13B07F8E1A680F5B00A75B9A /* Resources */,',
    `\t\t\t\t${ids.embed} /* Embed App Extensions */,`
  )
  one(
    'LastSwiftMigration = 1120;\n\t\t\t\t\t};',
    `\t\t\t\t\t${ids.target} = { CreatedOnToolsVersion = 16.0; LastSwiftMigration = 1600; };`
  )
  one('dependencies = (', `\t\t\t\t${ids.dependency} /* PBXTargetDependency */,`)
  const appBundleSetting = `PRODUCT_BUNDLE_IDENTIFIER = "${bundleId}";`
  if (project.split(appBundleSetting).length !== 3) {
    throw new Error('[vxrn] expected two app bundle settings for widget entitlements')
  }
  // the widget file carries the app group and optional apns entitlement.
  project = project.replaceAll(
    appBundleSetting,
    `CODE_SIGN_ENTITLEMENTS = ${name}/OneAppWidgets.entitlements;\n\t\t\t\t${appBundleSetting}`
  )
  return project
}

function generateSceneDelegate(args: {
  dest: string
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): void {
  const { dest, platform, app } = args
  if (platform !== 'ios') return
  FSExtra.writeFileSync(
    path.join(dest, app.name, 'SceneDelegate.swift'),
    renderSceneDelegateSwift(app.name)
  )
  // widgets write the app entitlements into their shared file; without
  // widgets the app gets its own file when it has any entitlement.
  const entitlements = appEntitlements(app)
  if (Object.keys(entitlements).length && !app.ios?.widgets) {
    FSExtra.writeFileSync(
      path.join(dest, app.name, `${app.name}.entitlements`),
      renderEntitlements(entitlements)
    )
  }
}

function generateIosAppIntents(dest: string, platform: 'ios' | 'android', app: NativeAppManifest): void {
  if (platform !== 'ios' || !app.ios?.appIntents) return
  FSExtra.writeFileSync(
    path.join(dest, app.name, 'OneAppIntents.swift'),
    renderIosAppIntentsSwift(app.ios.appIntents.actions)
  )
}

function generateIosWidgets(dest: string, app: NativeAppManifest): void {
  const widgets = app.ios?.widgets
  if (!widgets) return
  const appDir = path.join(dest, app.name)
  const extensionDir = path.join(dest, 'OneWidgets')
  FSExtra.mkdirSync(extensionDir, { recursive: true })
  const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>com.apple.security.application-groups</key><array><string>${escapeXml(widgets.appGroup)}</string></array></dict></plist>
`
  FSExtra.writeFileSync(
    path.join(appDir, 'OneAppWidgets.entitlements'),
    renderEntitlements(appEntitlements(app))
  )
  FSExtra.writeFileSync(path.join(extensionDir, 'OneWidgets.entitlements'), entitlements)
  FSExtra.writeFileSync(
    path.join(extensionDir, 'WidgetInfo.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDevelopmentRegion</key><string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key><string>${escapeXml(widgets.displayName)}</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key><string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key><string>${escapeXml(app.version || '1.0')}</string>
  <key>CFBundleVersion</key><string>${escapeXml(app.ios?.buildNumber || '1')}</string>
  <key>NSExtension</key><dict><key>NSExtensionPointIdentifier</key><string>com.apple.widgetkit-extension</string></dict>
</dict></plist>
`
  )
  FSExtra.writeFileSync(
    path.join(appDir, 'OneWidgetContract.swift'),
    `import Foundation
import ActivityKit

enum OneWidgetContract {
  static let appGroup = ${JSON.stringify(widgets.appGroup)}
  static let kind = ${JSON.stringify(widgets.kind)}
  static let dataKey = "one.widget.data"

  struct Data: Codable {
    let title: String
    let value: String
    let subtitle: String
    let layout: String?
  }

  struct Attributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
      let status: String
      let value: String
      let layout: String?
    }
    let title: String
  }
}
`
  )
  FSExtra.writeFileSync(
    path.join(extensionDir, 'OneWidget.swift'),
    `import SwiftUI
import WidgetKit
import ActivityKit

struct OneWidgetNode: Decodable {
  let type: String
  let text: String?
  let style: Style?
  let children: [OneWidgetNode]?
  let systemName: String?
  let value: Double?
  let total: Double?
  let fill: String?
  let cornerRadius: Double?
  let url: String?

  struct Style: Decodable {
    let color: String?
    let backgroundColor: String?
    let fontSize: Double?
    let fontWeight: String?
    let fontDesign: String?
    let padding: Double?
    let borderRadius: Double?
    let spacing: Double?
    let width: Double?
    let height: Double?
    let opacity: Double?
    let lineLimit: Int?
    let alignment: String?
  }
}

struct OneActivityView: Decodable {
  let lockScreen: OneWidgetNode
  let compactLeading: OneWidgetNode?
  let compactTrailing: OneWidgetNode?
  let minimal: OneWidgetNode?
  let expandedLeading: OneWidgetNode?
  let expandedTrailing: OneWidgetNode?
  let expandedBottom: OneWidgetNode?
}

private func oneDecode<T: Decodable>(_ value: String?, as type: T.Type) -> T? {
  guard let value, let data = value.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(type, from: data)
}

private func oneColor(_ hex: String?) -> Color? {
  guard let hex, hex.count == 7, hex.first == "#",
        let rgb = Int(hex.dropFirst(), radix: 16) else { return nil }
  return Color(red: Double((rgb >> 16) & 255) / 255,
               green: Double((rgb >> 8) & 255) / 255,
               blue: Double(rgb & 255) / 255)
}

struct OneWidgetRendered: View {
  let node: OneWidgetNode

  private var alignment: Alignment {
    switch node.style?.alignment {
    case "leading": .leading
    case "trailing": .trailing
    default: .center
    }
  }

  private var horizontalAlignment: HorizontalAlignment {
    switch node.style?.alignment {
    case "center": .center
    case "trailing": .trailing
    default: .leading
    }
  }

  private var weight: Font.Weight {
    switch node.style?.fontWeight {
    case "medium": .medium
    case "semibold": .semibold
    case "bold": .bold
    default: .regular
    }
  }

  private var design: Font.Design {
    switch node.style?.fontDesign {
    case "rounded": .rounded
    case "serif": .serif
    case "monospaced": .monospaced
    default: .default
    }
  }

  var body: some View {
    Group {
      switch node.type {
      case "text":
        Text(node.text ?? "")
          .font(.system(size: CGFloat(node.style?.fontSize ?? 16), weight: weight, design: design))
      case "vstack":
        VStack(alignment: horizontalAlignment, spacing: CGFloat(node.style?.spacing ?? 8)) {
          ForEach(Array((node.children ?? []).enumerated()), id: \\.offset) { _, child in
            OneWidgetRendered(node: child)
          }
        }
      case "hstack":
        HStack(spacing: CGFloat(node.style?.spacing ?? 8)) {
          ForEach(Array((node.children ?? []).enumerated()), id: \\.offset) { _, child in
            OneWidgetRendered(node: child)
          }
        }
      case "zstack":
        ZStack(alignment: alignment) {
          ForEach(Array((node.children ?? []).enumerated()), id: \\.offset) { _, child in
            OneWidgetRendered(node: child)
          }
        }
      case "spacer": Spacer(minLength: 0)
      case "divider": Divider()
      case "image":
        if let systemName = node.systemName {
          Image(systemName: systemName)
            .font(.system(size: CGFloat(node.style?.fontSize ?? 20), weight: weight))
        }
      case "progress":
        ProgressView(value: node.value ?? 0, total: node.total ?? 1)
          .tint(oneColor(node.style?.color))
      case "gauge":
        Gauge(value: node.value ?? 0, in: 0...(node.total ?? 1)) { EmptyView() }
          .gaugeStyle(.accessoryCircular)
          .tint(oneColor(node.style?.color))
      case "circle":
        Circle().fill(oneColor(node.fill) ?? .primary)
      case "rectangle":
        Rectangle().fill(oneColor(node.fill) ?? .primary)
      case "rounded-rectangle":
        RoundedRectangle(cornerRadius: CGFloat(node.cornerRadius ?? 8))
          .fill(oneColor(node.fill) ?? .primary)
      case "link":
        if let url = node.url.flatMap(URL.init(string:)) {
          Link(destination: url) {
            ForEach(Array((node.children ?? []).enumerated()), id: \\.offset) { _, child in
              OneWidgetRendered(node: child)
            }
          }
        }
      default: EmptyView()
      }
    }
    .foregroundColor(oneColor(node.style?.color))
    .lineLimit(node.style?.lineLimit)
    .frame(width: node.style?.width.map { CGFloat($0) },
           height: node.style?.height.map { CGFloat($0) },
           alignment: alignment)
    .opacity(node.style?.opacity ?? 1)
    .padding(CGFloat(node.style?.padding ?? 0))
    .background { if let fill = oneColor(node.style?.backgroundColor) { fill } }
    .clipShape(RoundedRectangle(cornerRadius: CGFloat(node.style?.borderRadius ?? 0)))
  }
}

struct OneWidgetEntry: TimelineEntry {
  let date: Date
  let data: OneWidgetContract.Data
}

struct OneWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> OneWidgetEntry {
    OneWidgetEntry(date: .now, data: .init(title: ${JSON.stringify(widgets.displayName)}, value: "", subtitle: "", layout: nil))
  }

  func getSnapshot(in context: Context, completion: @escaping (OneWidgetEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<OneWidgetEntry>) -> Void) {
    completion(Timeline(entries: [entry()], policy: .never))
  }

  private func entry() -> OneWidgetEntry {
    let stored = UserDefaults(suiteName: OneWidgetContract.appGroup)?.data(forKey: OneWidgetContract.dataKey)
    let data = stored.flatMap { try? JSONDecoder().decode(OneWidgetContract.Data.self, from: $0) }
      ?? .init(title: ${JSON.stringify(widgets.displayName)}, value: "", subtitle: "", layout: nil)
    return OneWidgetEntry(date: .now, data: data)
  }
}

struct OneWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: OneWidgetContract.kind, provider: OneWidgetProvider()) { entry in
      Group {
        if let layout = oneDecode(entry.data.layout, as: OneWidgetNode.self) {
          OneWidgetRendered(node: layout)
        } else {
          VStack(alignment: .leading, spacing: 8) {
            Text(entry.data.title).font(.headline)
            Text(entry.data.value).font(.title2).bold()
            Text(entry.data.subtitle).font(.caption)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName(${JSON.stringify(widgets.displayName)})
    .description(${JSON.stringify(widgets.description)})
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct OneLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: OneWidgetContract.Attributes.self) { context in
      Group {
        if let layout = oneDecode(context.state.layout, as: OneActivityView.self) {
          OneWidgetRendered(node: layout.lockScreen)
        } else {
          HStack {
            VStack(alignment: .leading) {
              Text(context.attributes.title).font(.headline)
              Text(context.state.status)
            }
            Spacer()
            Text(context.state.value).bold()
          }
        }
      }
      .padding()
      .activityBackgroundTint(.blue.opacity(0.2))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          if let layout = oneDecode(context.state.layout, as: OneActivityView.self),
             let leading = layout.expandedLeading {
            OneWidgetRendered(node: leading)
          } else {
            Text(context.attributes.title)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          if let layout = oneDecode(context.state.layout, as: OneActivityView.self),
             let trailing = layout.expandedTrailing {
            OneWidgetRendered(node: trailing)
          } else {
            Text(context.state.value)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let layout = oneDecode(context.state.layout, as: OneActivityView.self) {
            OneWidgetRendered(node: layout.expandedBottom ?? layout.lockScreen)
          } else {
            Text(context.state.status)
          }
        }
      } compactLeading: {
        if let layout = oneDecode(context.state.layout, as: OneActivityView.self),
           let leading = layout.compactLeading {
          OneWidgetRendered(node: leading)
        } else {
          Text(context.attributes.title)
        }
      } compactTrailing: {
        if let layout = oneDecode(context.state.layout, as: OneActivityView.self),
           let trailing = layout.compactTrailing {
          OneWidgetRendered(node: trailing)
        } else {
          Text(context.state.value)
        }
      } minimal: {
        if let layout = oneDecode(context.state.layout, as: OneActivityView.self),
           let minimal = layout.minimal {
          OneWidgetRendered(node: minimal)
        } else {
          Text(context.state.value)
        }
      }
    }
  }
}

@main
struct OneWidgetsBundle: WidgetBundle {
  var body: some Widget {
    OneWidget()
    OneLiveActivity()
  }
}
`
  )
  FSExtra.writeFileSync(
    path.join(appDir, 'OneWidgetsBridge.m'),
    `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(OneWidgetsBridge, RCTEventEmitter)
RCT_EXTERN_METHOD(writeWidget:(NSString *)title value:(NSString *)value subtitle:(NSString *)subtitle resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(writeView:(NSString *)layout resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(start:(NSString *)title status:(NSString *)status value:(NSString *)value push:(BOOL)push resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(startView:(NSString *)title layout:(NSString *)layout push:(BOOL)push resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(update:(NSString *)identifier status:(NSString *)status value:(NSString *)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(updateView:(NSString *)identifier layout:(NSString *)layout resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(end:(NSString *)identifier resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(pushToken:(NSString *)identifier resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
`
  )
  FSExtra.writeFileSync(
    path.join(appDir, 'OneWidgetsBridge.swift'),
    `import Foundation
import React
import WidgetKit
import ActivityKit

@objc(OneWidgetsBridge)
class OneWidgetsBridge: RCTEventEmitter {
  private var tokenTasks: [String: Task<Void, Never>] = [:]

  override func supportedEvents() -> [String]! { ["oneLiveActivityPushToken"] }

  override func startObserving() {
    for activity in Activity<OneWidgetContract.Attributes>.activities {
      observeToken(activity)
    }
  }

  override func stopObserving() {
    for task in tokenTasks.values { task.cancel() }
    tokenTasks.removeAll()
  }

  private func observeToken(_ activity: Activity<OneWidgetContract.Attributes>) {
    guard tokenTasks[activity.id] == nil else { return }
    tokenTasks[activity.id] = Task { [weak self] in
      for await token in activity.pushTokenUpdates {
        self?.sendEvent(withName: "oneLiveActivityPushToken", body: [
          "id": activity.id,
          "token": token.map { String(format: "%02x", $0) }.joined(),
        ])
      }
    }
  }

  @objc(writeWidget:value:subtitle:resolver:rejecter:)
  func writeWidget(_ title: String, value: String, subtitle: String,
                   resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: OneWidgetContract.appGroup) else {
      reject("app_group", "Cannot open the configured App Group", nil)
      return
    }
    do {
      defaults.set(try JSONEncoder().encode(OneWidgetContract.Data(title: title, value: value, subtitle: subtitle, layout: nil)),
                   forKey: OneWidgetContract.dataKey)
      WidgetCenter.shared.reloadTimelines(ofKind: OneWidgetContract.kind)
      resolve(nil)
    } catch {
      reject("widget_write", error.localizedDescription, error)
    }
  }

  @objc(writeView:resolver:rejecter:)
  func writeView(_ layout: String, resolver resolve: RCTPromiseResolveBlock,
                 rejecter reject: RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: OneWidgetContract.appGroup) else {
      reject("app_group", "Cannot open the configured App Group", nil)
      return
    }
    do {
      defaults.set(try JSONEncoder().encode(OneWidgetContract.Data(title: "", value: "", subtitle: "", layout: layout)),
                   forKey: OneWidgetContract.dataKey)
      WidgetCenter.shared.reloadTimelines(ofKind: OneWidgetContract.kind)
      resolve(nil)
    } catch {
      reject("widget_write", error.localizedDescription, error)
    }
  }

  @objc(start:status:value:push:resolver:rejecter:)
  func start(_ title: String, status: String, value: String, push: Bool,
             resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      reject("activities_disabled", "Live Activities are disabled", nil)
      return
    }
    do {
      let activity = try Activity<OneWidgetContract.Attributes>.request(
        attributes: .init(title: title),
        content: .init(state: .init(status: status, value: value, layout: nil), staleDate: nil),
        pushType: push ? .token : nil
      )
      observeToken(activity)
      resolve(activity.id)
    } catch {
      reject("activity_start", error.localizedDescription, error)
    }
  }

  @objc(startView:layout:push:resolver:rejecter:)
  func startView(_ title: String, layout: String, push: Bool,
                 resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      reject("activities_disabled", "Live Activities are disabled", nil)
      return
    }
    do {
      let activity = try Activity<OneWidgetContract.Attributes>.request(
        attributes: .init(title: title),
        content: .init(state: .init(status: "", value: "", layout: layout), staleDate: nil),
        pushType: push ? .token : nil
      )
      observeToken(activity)
      resolve(activity.id)
    } catch {
      reject("activity_start", error.localizedDescription, error)
    }
  }

  @objc(update:status:value:resolver:rejecter:)
  func update(_ identifier: String, status: String, value: String,
              resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let activity = Activity<OneWidgetContract.Attributes>.activities.first(where: { $0.id == identifier }) else {
      reject("activity_missing", "Live Activity not found", nil)
      return
    }
    Task {
      await activity.update(.init(state: .init(status: status, value: value, layout: nil), staleDate: nil))
      resolve(nil)
    }
  }

  @objc(updateView:layout:resolver:rejecter:)
  func updateView(_ identifier: String, layout: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let activity = Activity<OneWidgetContract.Attributes>.activities.first(where: { $0.id == identifier }) else {
      reject("activity_missing", "Live Activity not found", nil)
      return
    }
    Task {
      await activity.update(.init(state: .init(status: "", value: "", layout: layout), staleDate: nil))
      resolve(nil)
    }
  }

  @objc(end:resolver:rejecter:)
  func end(_ identifier: String, resolver resolve: @escaping RCTPromiseResolveBlock,
           rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let activity = Activity<OneWidgetContract.Attributes>.activities.first(where: { $0.id == identifier }) else {
      reject("activity_missing", "Live Activity not found", nil)
      return
    }
    Task {
      await activity.end(nil, dismissalPolicy: .immediate)
      tokenTasks.removeValue(forKey: identifier)?.cancel()
      resolve(nil)
    }
  }

  @objc(pushToken:resolver:rejecter:)
  func pushToken(_ identifier: String, resolver resolve: RCTPromiseResolveBlock,
                 rejecter reject: RCTPromiseRejectBlock) {
    guard let activity = Activity<OneWidgetContract.Attributes>.activities.first(where: { $0.id == identifier }) else {
      reject("activity_missing", "Live Activity not found", nil)
      return
    }
    if let data = activity.pushToken {
      resolve(data.map { String(format: "%02x", $0) }.joined())
    } else {
      resolve(NSNull())
    }
  }
}
`
  )
}

export interface RenderedPrebuildFile {
  destRelativePath: string
  content: string | null
}

const IPAD_APP_ICON_SIZES: Array<[string, string[]]> = [
  ['20x20', ['1x', '2x']],
  ['29x29', ['1x', '2x']],
  ['40x40', ['1x', '2x']],
  ['76x76', ['1x', '2x']],
  ['83.5x83.5', ['2x']],
]

async function generateAppIcons(args: {
  root: string
  dest: string
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): Promise<void> {
  const { root, dest, platform, app } = args
  if (!app.icon) return

  if (platform === 'ios') {
    const assetsDir = path.join(dest, app.name, 'Images.xcassets')
    const template: {
      images: Array<{ idiom: string; scale: string; size: string; filename?: string }>
      info: { author: string; version: number }
    } = JSON.parse(FSExtra.readFileSync(path.join(assetsDir, 'AppIcon.appiconset', 'Contents.json'), 'utf8'))
    const icons: Array<[string, { source: string; backgroundColor: string }]> = [
      ['AppIcon', app.icon],
      ...Object.entries(app.ios?.alternateIcons ?? {}),
    ]
    for (const [name, icon] of icons) {
      const source = path.resolve(root, icon.source)
      if (!FSExtra.existsSync(source)) {
        throw new Error(`[vxrn] native.app icon source does not exist: ${source}`)
      }
      const metadata = await sharp(source).metadata()
      if (metadata.width !== metadata.height || metadata.width === undefined || metadata.width < 1024) {
        throw new Error(`[vxrn] native.app icon source must be a square image at least 1024px wide: ${source}`)
      }
      const iconDir = path.join(assetsDir, `${name}.appiconset`)
      FSExtra.mkdirSync(iconDir, { recursive: true })
      const contents = structuredClone(template)
      // the template is iPhone-only. App Store upload rejects a tablet build
      // without the iPad sizes (ITMS-90023, 152 and 167 pixels among them).
      if (app.ios?.tablet) {
        for (const [size, scales] of IPAD_APP_ICON_SIZES) {
          for (const scale of scales) contents.images.push({ idiom: 'ipad', scale, size })
        }
      }
      for (const image of contents.images) {
        const points = Number.parseFloat(image.size.split('x')[0])
        const scale = Number.parseInt(image.scale, 10)
        const pixels = points * scale
        const filename = image.idiom === 'ios-marketing'
          ? 'icon-1024.png' : `icon-${points}@${image.scale}.png`
        image.filename = filename
        await sharp(source)
          .rotate()
          .resize(pixels, pixels, { fit: 'cover' })
          .flatten({ background: icon.backgroundColor })
          .png()
          .toFile(path.join(iconDir, filename))
      }
      FSExtra.writeFileSync(path.join(iconDir, 'Contents.json'), `${JSON.stringify(contents, null, 2)}\n`)
    }
    return
  }

  const source = path.resolve(root, app.icon.source)
  if (!FSExtra.existsSync(source)) {
    throw new Error(`[vxrn] native.app.icon source does not exist: ${source}`)
  }
  const metadata = await sharp(source).metadata()
  if (metadata.width !== metadata.height || metadata.width === undefined || metadata.width < 1024) {
    throw new Error('[vxrn] native.app.icon source must be a square image at least 1024px wide')
  }
  for (const [density, multiplier] of Object.entries(ANDROID_DENSITIES)) {
    const pixels = 48 * multiplier
    const iconDir = path.join(dest, 'app', 'src', 'main', 'res', `mipmap-${density}`)
    for (const filename of ['ic_launcher.png', 'ic_launcher_round.png']) {
      await sharp(source)
        .rotate()
        .resize(pixels, pixels, { fit: 'cover' })
        .flatten({ background: app.icon.backgroundColor })
        .png()
        .toFile(path.join(iconDir, filename))
    }
  }
}

// the android 8+ launcher icon: foreground, background and monochrome
// layers at 108dp per density, wired by mipmap-anydpi-v26. a background color
// lives in its own resource file, as android studio's image asset tool writes
// it, so the splash's colors.xml never collides with it.
async function generateAdaptiveIcon(args: {
  root: string
  dest: string
  app: NativeAppManifest
}): Promise<void> {
  const { root, dest, app } = args
  const adaptiveIcon = app.android?.adaptiveIcon
  if (!adaptiveIcon) return

  const res = path.join(dest, 'app', 'src', 'main', 'res')
  const layers = {
    foreground: adaptiveIcon.foreground,
    background: adaptiveIcon.background,
    monochrome: adaptiveIcon.monochrome,
  }
  for (const [layer, file] of Object.entries(layers)) {
    if (!file) continue
    const source = path.resolve(root, file)
    if (!FSExtra.existsSync(source)) {
      throw new Error(`[vxrn] native.app.android.adaptiveIcon.${layer} does not exist: ${source}`)
    }
    for (const [density, multiplier] of Object.entries(ANDROID_DENSITIES)) {
      const pixels = 108 * multiplier
      await sharp(source)
        .rotate()
        .resize(pixels, pixels, { fit: 'cover' })
        .png()
        .toFile(path.join(res, `mipmap-${density}`, `ic_launcher_${layer}.png`))
    }
  }
  if (!adaptiveIcon.background) {
    FSExtra.writeFileSync(
      path.join(res, 'values', 'ic_launcher_background.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${adaptiveIcon.backgroundColor ?? '#FFFFFF'}</color>
</resources>
`
    )
  }
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="${adaptiveIcon.background ? '@mipmap/ic_launcher_background' : '@color/ic_launcher_background'}"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
${adaptiveIcon.monochrome ? '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n' : ''}</adaptive-icon>
`
  const anydpi = path.join(res, 'mipmap-anydpi-v26')
  FSExtra.mkdirSync(anydpi, { recursive: true })
  for (const filename of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    FSExtra.writeFileSync(path.join(anydpi, filename), adaptiveXml)
  }
}

const IOS_DARK_APPEARANCE = [{ appearance: 'luminosity', value: 'dark' }]

function srgb(hex: string) {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16) / 255,
    green: Number.parseInt(hex.slice(3, 5), 16) / 255,
    blue: Number.parseInt(hex.slice(5, 7), 16) / 255,
  }
}

// an asset catalog color entry, with its dark appearance when one is given.
function xcodeColorSet(light: string, dark: string | undefined): string {
  const entry = (hex: string) => {
    const { red, green, blue } = srgb(hex)
    return {
      color: {
        'color-space': 'srgb',
        components: {
          red: red.toFixed(3),
          green: green.toFixed(3),
          blue: blue.toFixed(3),
          alpha: '1.000',
        },
      },
      idiom: 'universal',
    }
  }
  return `${JSON.stringify(
    {
      colors: [
        entry(light),
        ...(dark ? [{ appearances: IOS_DARK_APPEARANCE, ...entry(dark) }] : []),
      ],
      info: { author: 'xcode', version: 1 },
    },
    null,
    2
  )}\n`
}

// the AccentColor asset the Info.plist names as the app's tint.
function generateAccentColor(args: { dest: string; app: NativeAppManifest }): void {
  const accent = args.app.ios?.accentColor
  if (!accent) return
  const colorDir = path.join(args.dest, args.app.name, 'Images.xcassets', 'AccentColor.colorset')
  FSExtra.mkdirSync(colorDir, { recursive: true })
  FSExtra.writeFileSync(
    path.join(colorDir, 'Contents.json'),
    xcodeColorSet(accent.light, accent.dark)
  )
}

async function generateSplashScreen(args: {
  root: string
  dest: string
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): Promise<void> {
  const { root, dest, platform, app } = args
  if (!app.splash) return

  // a cover splash fills the launch screen, so its artwork keeps its margins.
  const cover = app.splash.resizeMode === 'cover'
  const prepareArtwork = async (sourcePath: string, backgroundColor: string) => {
    const source = path.resolve(root, sourcePath)
    if (!FSExtra.existsSync(source)) {
      throw new Error(`[vxrn] native.app.splash source does not exist: ${source}`)
    }
    // a vector source rasterizes at the density its largest use needs: the
    // @3x launch artwork, or the android xxxhdpi splash.
    const { width: sourceWidth, format } = await sharp(source).metadata()
    const density =
      format === 'svg' && sourceWidth && !cover
        ? Math.min(2400, Math.ceil((72 * 4 * (app.splash?.width ?? 200)) / sourceWidth))
        : undefined
    const image = sharp(source, density ? { density } : {}).rotate()
    const prepared = await (cover ? image : image.trim({ background: backgroundColor }))
      .png()
      .toBuffer({ resolveWithObject: true })
    if (!prepared.info.width || !prepared.info.height) {
      throw new Error('[vxrn] native.app.splash source must be an image')
    }
    return prepared
  }
  const { data: artwork, info: metadata } = await prepareArtwork(
    app.splash.source,
    app.splash.backgroundColor
  )
  const dark = app.splash.dark
  const darkArtwork = dark?.source
    ? (await prepareArtwork(dark.source, dark.backgroundColor)).data
    : undefined
  const artworkWidth = app.splash.width ?? 200
  const artworkHeight = Number(
    (artworkWidth * (metadata.height / metadata.width)).toFixed(3)
  )

  if (platform === 'ios') {
    const appDir = path.join(dest, app.name)
    const assets = path.join(appDir, 'Images.xcassets')
    // one imageset per image, each with an optional dark appearance. contain
    // artwork is drawn at 1x, 2x and 3x of its launch width; a full-bleed
    // image keeps its own resolution.
    const writeImageSet = async (
      name: string,
      light: Buffer,
      dark: Buffer | undefined,
      pointWidth: number | undefined
    ) => {
      const dir = path.join(assets, `${name}.imageset`)
      FSExtra.mkdirSync(dir, { recursive: true })
      const scales = pointWidth === undefined ? [1] : [1, 2, 3]
      const images: Array<Record<string, unknown>> = []
      for (const [variant, suffix, appearances] of [
        [light, '', undefined],
        [dark, '-dark', IOS_DARK_APPEARANCE],
      ] as const) {
        if (!variant) continue
        for (const scale of scales) {
          const filename = `${name.toLowerCase()}${suffix}${scale === 1 ? '' : `@${scale}x`}.png`
          const output = sharp(variant)
          await (pointWidth === undefined
            ? output
            : output.resize({ width: Math.round(pointWidth * scale) })
          )
            .png()
            .toFile(path.join(dir, filename))
          images.push({
            ...(appearances ? { appearances } : {}),
            filename,
            idiom: 'universal',
            scale: `${scale}x`,
          })
        }
      }
      FSExtra.writeFileSync(
        path.join(dir, 'Contents.json'),
        `${JSON.stringify({ images, info: { author: 'xcode', version: 1 } }, null, 2)}\n`
      )
    }
    await writeImageSet('Splash', artwork, darkArtwork, cover ? undefined : artworkWidth)
    const readBackground = (sourcePath: string) => {
      const source = path.resolve(root, sourcePath)
      if (!FSExtra.existsSync(source)) {
        throw new Error(`[vxrn] native.app.splash backgroundImage does not exist: ${source}`)
      }
      return sharp(source).rotate().png().toBuffer({ resolveWithObject: true })
    }
    const background = app.splash.backgroundImage
      ? await readBackground(app.splash.backgroundImage)
      : undefined
    const darkBackground = dark?.backgroundImage
      ? (await readBackground(dark.backgroundImage)).data
      : undefined
    if (background) {
      await writeImageSet('SplashBackgroundImage', background.data, darkBackground, undefined)
    }
    // the launch background is a named color so a dark launch gets its own.
    const colorDir = path.join(assets, 'SplashBackground.colorset')
    FSExtra.mkdirSync(colorDir, { recursive: true })
    FSExtra.writeFileSync(
      path.join(colorDir, 'Contents.json'),
      xcodeColorSet(app.splash.backgroundColor, dark?.backgroundColor)
    )
    const { red, green, blue } = srgb(app.splash.backgroundColor)
    FSExtra.writeFileSync(
      path.join(appDir, 'LaunchScreen.storyboard'),
      `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="15702" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="launch-controller">
  <device id="retina6_12" orientation="portrait" appearance="light"/>
  <dependencies>
    <deployment identifier="iOS"/>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="15704"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="launch-scene">
      <objects>
        <viewController id="launch-controller" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="launch-view">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <subviews>${
              background
                ? `
              <imageView userInteractionEnabled="NO" contentMode="scaleAspectFill" image="SplashBackgroundImage" translatesAutoresizingMaskIntoConstraints="NO" id="splash-background"/>`
                : ''
            }
              <imageView userInteractionEnabled="NO" contentMode="${cover ? 'scaleAspectFill' : 'scaleAspectFit'}" image="Splash" translatesAutoresizingMaskIntoConstraints="NO" id="splash-image"/>
            </subviews>
            <color key="backgroundColor" name="SplashBackground"/>
            <constraints>${
              background
                ? `
              <constraint firstItem="splash-background" firstAttribute="leading" secondItem="launch-view" secondAttribute="leading" id="splash-background-leading"/>
              <constraint firstItem="splash-background" firstAttribute="trailing" secondItem="launch-view" secondAttribute="trailing" id="splash-background-trailing"/>
              <constraint firstItem="splash-background" firstAttribute="top" secondItem="launch-view" secondAttribute="top" id="splash-background-top"/>
              <constraint firstItem="splash-background" firstAttribute="bottom" secondItem="launch-view" secondAttribute="bottom" id="splash-background-bottom"/>`
                : ''
            }
${
  cover
    ? `              <constraint firstItem="splash-image" firstAttribute="leading" secondItem="launch-view" secondAttribute="leading" id="splash-leading"/>
              <constraint firstItem="splash-image" firstAttribute="trailing" secondItem="launch-view" secondAttribute="trailing" id="splash-trailing"/>
              <constraint firstItem="splash-image" firstAttribute="top" secondItem="launch-view" secondAttribute="top" id="splash-top"/>
              <constraint firstItem="splash-image" firstAttribute="bottom" secondItem="launch-view" secondAttribute="bottom" id="splash-bottom"/>`
    : `              <constraint firstItem="splash-image" firstAttribute="centerX" secondItem="launch-view" secondAttribute="centerX" id="splash-center-x"/>
              <constraint firstItem="splash-image" firstAttribute="centerY" secondItem="launch-view" secondAttribute="centerY" id="splash-center-y"/>
              <constraint firstItem="splash-image" firstAttribute="width" constant="${artworkWidth}" id="splash-width"/>
              <constraint firstItem="splash-image" firstAttribute="height" constant="${artworkHeight}" id="splash-height"/>`
}
            </constraints>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="launch-responder" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
  <resources>
    <image name="Splash" width="${cover ? metadata.width : artworkWidth}" height="${cover ? metadata.height : artworkHeight}"/>${
      background
        ? `
    <image name="SplashBackgroundImage" width="${background.info.width}" height="${background.info.height}"/>`
        : ''
    }
    <namedColor name="SplashBackground">
      <color red="${red}" green="${green}" blue="${blue}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
    </namedColor>
  </resources>
</document>
`
    )
    return
  }

  const mainRes = path.join(dest, 'app', 'src', 'main', 'res')
  const drawable = path.join(mainRes, 'drawable')
  const variants: Array<[Buffer, string]> = [[artwork, 'drawable']]
  if (darkArtwork) variants.push([darkArtwork, 'drawable-night'])
  for (const [variantArtwork, drawablePrefix] of variants) {
    for (const [density, multiplier] of Object.entries(ANDROID_DENSITIES)) {
      const canvasSize = 288 * multiplier
      const imageSize = Math.round(artworkWidth * multiplier)
      const contained = await sharp(variantArtwork)
        .resize(imageSize, imageSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
      const drawableDensity = path.join(mainRes, `${drawablePrefix}-${density}`)
      FSExtra.mkdirSync(drawableDensity, { recursive: true })
      await sharp({
        create: {
          width: canvasSize,
          height: canvasSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          {
            input: contained,
            left: Math.round((canvasSize - imageSize) / 2),
            top: Math.round((canvasSize - imageSize) / 2),
          },
        ])
        .png()
        .toFile(path.join(drawableDensity, 'splash.png'))
    }
  }
  FSExtra.writeFileSync(
    path.join(drawable, 'launch_screen.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background" />
    <item>
        <bitmap android:gravity="center" android:src="@drawable/splash" />
    </item>
</layer-list>
`
  )
  FSExtra.writeFileSync(
    path.join(mainRes, 'values', 'colors.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">${app.splash.backgroundColor}</color>
</resources>
`
  )
  if (dark) {
    FSExtra.mkdirSync(path.join(mainRes, 'values-night'), { recursive: true })
    FSExtra.writeFileSync(
      path.join(mainRes, 'values-night', 'colors.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">${dark.backgroundColor}</color>
</resources>
`
    )
  }
  const stylesPath = path.join(mainRes, 'values', 'styles.xml')
  const styles = FSExtra.readFileSync(stylesPath, 'utf8').replace(
    '        <!-- Customize your theme here. -->',
    '        <item name="android:windowBackground">@drawable/launch_screen</item>'
  )
  FSExtra.writeFileSync(stylesPath, styles)
  const stylesV31 = path.join(mainRes, 'values-v31')
  FSExtra.mkdirSync(stylesV31, { recursive: true })
  // a values-v31 AppTheme replaces the base one on API 31+, so it is the base
  // theme (parent included) plus the system splash items, never a bare style.
  if (!styles.includes('</style>')) {
    throw new Error('[vxrn] prebuild template styles.xml lost its AppTheme </style> anchor')
  }
  FSExtra.writeFileSync(
    path.join(stylesV31, 'styles.xml'),
    styles.replace(
      '</style>',
      `    <item name="android:windowSplashScreenBackground">@color/splash_background</item>
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/splash</item>
    </style>`
    )
  )
}

// pure render of one template file: path renames plus content replacements.
// `content: null` means binary copy.
export function renderPrebuildFile(args: {
  relativePath: string
  content: string | null
  platform: 'ios' | 'android'
  app: NativeAppManifest
  nitroWebImage?: boolean
}): RenderedPrebuildFile {
  const { relativePath, content, platform, app, nitroWebImage } = args
  const appName = app.name
  const schemes =
    app.scheme === undefined ? [] : Array.isArray(app.scheme) ? app.scheme : [app.scheme]
  let destRelativePath = transformPath(relativePath)

  // remap before the helloworld rename below, which would otherwise rewrite
  // the placeholder package path first.
  if (platform === 'android' && app.android) {
    const packagePath = app.android.applicationId.split('.').join('/')
    destRelativePath = destRelativePath.split(ANDROID_PACKAGE_PATH).join(packagePath)
  }

  destRelativePath = destRelativePath
    .replace(/HelloWorld/g, appName)
    .replace(/helloworld/g, appName.toLowerCase())

  let rendered = content
  if (rendered !== null) {
    // platform ids first: the generic helloworld rename below would
    // otherwise rewrite the placeholder package before it is remapped.
    const replacements: Array<[string, string]> = []
    if (platform === 'ios' && app.ios) {
      replacements.push([IOS_BUNDLE_PLACEHOLDER, app.ios.bundleId])
    }
    if (platform === 'android' && app.android) {
      replacements.push([ANDROID_PACKAGE_PLACEHOLDER, app.android.applicationId])
    }
    replacements.push(
      ['Hello App Display Name', app.displayName || appName],
      ['HelloWorld', appName],
      ['helloworld', appName.toLowerCase()]
    )
    for (const [find, value] of replacements) {
      rendered = rendered.split(find).join(value)
    }
    if (platform === 'ios' && relativePath.endsWith('/Info.plist')) {
      const stamps: string[] = []
      if (schemes.length) {
        stamps.push(`\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleTypeRole</key>
\t\t\t<string>Editor</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
${schemes.map((scheme) => `\t\t\t\t<string>${scheme}</string>`).join('\n')}
\t\t\t</array>
\t\t</dict>
\t</array>`)
      }
      if (app.ios?.usesNonExemptEncryption !== undefined) {
        stamps.push(
          `\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<${app.ios.usesNonExemptEncryption ? 'true' : 'false'}/>`
        )
      }
      if (app.ios?.accentColor) {
        stamps.push('\t<key>NSAccentColorName</key>\n\t<string>AccentColor</string>')
      }
      if (app.ios?.fileSharing) {
        stamps.push(
          `\t<key>UIFileSharingEnabled</key>\n\t<true/>\n\t<key>LSSupportsOpeningDocumentsInPlace</key>\n\t<true/>`
        )
      }
      if (app.photoLibrary?.readWrite !== undefined) {
        stamps.push('\t<key>PHPhotoLibraryPreventAutomaticLimitedAccessAlert</key>\n\t<true/>')
      }
      if (app.notifications !== undefined) {
        // gates the UNUserNotificationCenter delegate install: apps that link
        // one without notifications keep whatever delegate their own
        // push library sets.
        stamps.push(`\t<key>${notificationsHost.enabledInfoPlistKey}</key>\n\t<true/>`)
      }
      if (app.notifications?.push === true) {
        // without the aps-environment entitlement the simulator never answers
        // registerForRemoteNotifications, so the token getter reads this to
        // reject at once like android's nopush flavor.
        stamps.push(`\t<key>${notificationsHost.pushInfoPlistKey}</key>\n\t<true/>`)
      }
      if (app.ios?.widgets) {
        stamps.push('\t<key>NSSupportsLiveActivities</key>\n\t<true/>')
      }
      const refreshTasks = app.ios?.backgroundTasks?.refresh ?? []
      const processingTasks = app.ios?.backgroundTasks?.processing ?? []
      if (refreshTasks.length || processingTasks.length) {
        const plistArray = (key: string, identifiers: string[]) =>
          `\t<key>${key}</key>\n\t<array>\n${identifiers.map((identifier) => `\t\t<string>${escapeXml(identifier)}</string>`).join('\n')}\n\t</array>`
        stamps.push(plistArray('BGTaskSchedulerPermittedIdentifiers', [...refreshTasks, ...processingTasks]))
        stamps.push(plistArray('OneBackgroundRefreshTaskIdentifiers', refreshTasks))
        stamps.push(plistArray('OneBackgroundProcessingTaskIdentifiers', processingTasks))
      }
      if (app.ios?.appIntents) {
        stamps.push(
          `\t<key>OneAppIntentIdentifiers</key>\n\t<array>\n${app.ios.appIntents.actions.map((action) => `\t\t<string>${escapeXml(action.id)}</string>`).join('\n')}\n\t</array>`
        )
      }
      const backgroundModes = [
        ...(app.pictureInPicture || app.audio?.background ? ['audio'] : []),
        ...(app.location?.background ? ['location'] : []),
        ...(refreshTasks.length ? ['fetch'] : []),
        ...(processingTasks.length ? ['processing'] : []),
      ]
      if (backgroundModes.length) {
        stamps.push(
          `\t<key>UIBackgroundModes</key>\n\t<array>\n${backgroundModes.map((mode) => `\t\t<string>${mode}</string>`).join('\n')}\n\t</array>`
        )
      }
      if (app.updates !== undefined) {
        // the launcher reads both; without the url the embedded bundle
        // launches with updates disabled.
        if (app.updates.url !== undefined) {
          stamps.push(
            `\t<key>${updatesHost.urlInfoPlistKey}</key>\n\t<string>${escapeXml(app.updates.url)}</string>`
          )
        }
        stamps.push(
          `\t<key>${updatesHost.runtimeVersionInfoPlistKey}</key>\n\t<string>${escapeXml(app.updates.runtimeVersion)}</string>`
        )
      }
      if (app.fonts?.length) {
        stamps.push(
          `\t<key>UIAppFonts</key>\n\t<array>\n${app.fonts.map((font) => `\t\t<string>${escapeXml(fontFileName(font))}</string>`).join('\n')}\n\t</array>`
        )
      }
      if (app.userInterfaceStyle !== undefined) {
        stamps.push(
          `\t<key>UIUserInterfaceStyle</key>\n\t<string>${app.userInterfaceStyle === 'light' ? 'Light' : app.userInterfaceStyle === 'dark' ? 'Dark' : 'Automatic'}</string>`
        )
      }
      if (app.orientation !== undefined) {
        // expo's orientation mapping: it sets the phone list only.
        const phoneOrientations =
          app.orientation === 'portrait'
            ? PORTRAIT_ORIENTATIONS
            : app.orientation === 'landscape'
              ? LANDSCAPE_ORIENTATIONS
              : [...PORTRAIT_ORIENTATIONS, ...LANDSCAPE_ORIENTATIONS]
        const phoneList =
          /\t<key>UISupportedInterfaceOrientations<\/key>\n\t<array>\n[\s\S]*?\t<\/array>/
        if (!phoneList.test(rendered)) {
          throw new Error(
            `[vxrn] prebuild template ${relativePath} lost its UISupportedInterfaceOrientations list`
          )
        }
        rendered = rendered.replace(
          phoneList,
          `\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n${phoneOrientations.map((orientation) => `\t\t<string>${orientation}</string>`).join('\n')}\n\t</array>`
        )
      }
      for (const [key, value] of Object.entries(app.ios?.infoPlist ?? {})) {
        if (rendered.includes(`<key>${key}</key>`) || stamps.some((stamp) => stamp.includes(`<key>${key}</key>`))) {
          throw new Error(
            `[vxrn] native.app.ios.infoPlist sets ${key}, which the template or native.app already writes: use its field`
          )
        }
        stamps.push(renderPlistEntries({ [key]: value }, '\t'))
      }
      if (stamps.length) {
        const anchor = '\t<key>LSRequiresIPhoneOS</key>'
        if (!rendered.includes(anchor))
          throw new Error(
            `[vxrn] prebuild template ${relativePath} lost its LSRequiresIPhoneOS anchor`
          )
        rendered = rendered.replace(anchor, `${stamps.join('\n')}\n${anchor}`)
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      (app.imagePicker?.camera !== undefined || app.speech !== undefined)
    ) {
      const anchor = '<uses-permission android:name="android.permission.INTERNET" />'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the camera or microphone permission: expected the INTERNET permission in app/src/main/AndroidManifest.xml'
        )
      }
      const stamps: string[] = []
      if (app.imagePicker?.camera !== undefined) {
        stamps.push('    <uses-permission android:name="android.permission.CAMERA" />')
      }
      if (app.speech !== undefined) {
        // package visibility (android 11+) hides the recognition service
        // from SpeechRecognizer.isRecognitionAvailable without the query
        stamps.push(
          '    <uses-permission android:name="android.permission.RECORD_AUDIO" />',
          '    <queries>\n      <intent>\n        <action android:name="android.speech.RecognitionService" />\n      </intent>\n    </queries>'
        )
      }
      rendered = rendered.replace(anchor, `${anchor}\n${stamps.join('\n')}`)
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.notifications !== undefined
    ) {
      const anchor = '<uses-permission android:name="android.permission.INTERNET" />'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp notification permissions: expected the INTERNET permission in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        anchor,
        [
          anchor,
          ...notificationsHost.androidPermissions.map(
            (permission) => `    <uses-permission android:name="${permission}" />`
          ),
        ].join('\n')
      )
      if (!rendered.includes(notificationsHost.androidPermissions[0])) {
        throw new Error(
          '[vxrn] failed to stamp notification permissions into app manifest'
        )
      }
      // the alarm and boot receiver lives in the app manifest, never the
      // library one, so apps without notifications gain nothing. alarms
      // arrive as explicit intents; only boot needs the filter.
      rendered = rendered.replace(
        '      </activity>\n    </application>',
        `      </activity>\n      <receiver android:name="${notificationsHost.receiver}" android:exported="false">\n          <intent-filter>\n              <action android:name="${notificationsHost.receiverAction}" />\n          </intent-filter>\n      </receiver>\n    </application>`
      )
      if (!rendered.includes(notificationsHost.receiver)) {
        throw new Error(
          '[vxrn] failed to stamp the notification receiver into app manifest'
        )
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.notifications?.push === true
    ) {
      // the fcm refresh service lives in the app manifest, never the
      // library one, so apps without push never start it. push implies the
      // notifications block above, so the receiver anchor is present.
      const anchor = notificationsHost.receiver
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the push service: expected the notification receiver in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        '      </receiver>\n    </application>',
        `      </receiver>\n      <service android:name="${notificationsHost.pushService}" android:exported="false">\n          <intent-filter>\n              <action android:name="${notificationsHost.pushServiceAction}" />\n          </intent-filter>\n      </service>\n    </application>`
      )
      if (!rendered.includes(notificationsHost.pushService)) {
        throw new Error('[vxrn] failed to stamp the push service into app manifest')
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/java/com/helloworld/MainApplication.kt' &&
      app.updates !== undefined
    ) {
      rendered = patchAndroidMainApplicationUpdatesHost(rendered)
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.updates !== undefined
    ) {
      // the launcher reads both; without the url the embedded bundle
      // launches with updates disabled.
      const anchor = '    </application>'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the updates config: expected </application> in app/src/main/AndroidManifest.xml'
        )
      }
      const stamps: string[] = []
      if (app.updates.url !== undefined) {
        stamps.push(
          `      <meta-data android:name="dev.onejs.updates.url" android:value="${escapeXml(app.updates.url)}" />`
        )
      }
      stamps.push(
        `      <meta-data android:name="dev.onejs.updates.runtimeVersion" android:value="${escapeXml(app.updates.runtimeVersion)}" />`
      )
      rendered = rendered.replace(anchor, `${stamps.join('\n')}\n${anchor}`)
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.android?.googleMapsApiKey !== undefined
    ) {
      const anchor = '    </application>'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the maps api key: expected </application> in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        anchor,
        `      <meta-data android:name="com.google.android.geo.API_KEY" android:value="${escapeXml(app.android.googleMapsApiKey)}" />\n${anchor}`
      )
    }
    if (
      platform === 'android' &&
      relativePath === 'gradle.properties' &&
      app.notifications?.push === true
    ) {
      // the flag one reads to compile the fcm source set in. it
      // lives in the root gradle.properties so library builds see it through
      // the root project; without it the file is untouched and firebase
      // messaging stays out of the app.
      const line = `${notificationsHost.pushGradleProperty}=true`
      if (!rendered.includes(line)) {
        const trailed = rendered.endsWith('\n') ? rendered : `${rendered}\n`
        rendered = `${trailed}\n# Remote push: set by native.app.notifications.push.\n${line}\n`
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'gradle.properties' &&
      app.android?.googleMapsApiKey !== undefined
    ) {
      // the flag one reads to compile the maps source set in. it
      // lives in the root gradle.properties so library builds see it through
      // the root project; without the key the file is untouched and maps
      // stays out of the app.
      const line = 'oneNativeMaps=true'
      if (!rendered.includes(line)) {
        const trailed = rendered.endsWith('\n') ? rendered : `${rendered}\n`
        rendered = `${trailed}\n# One.UI.Map: set by native.app.android.googleMapsApiKey.\n${line}\n`
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/res/values/styles.xml' &&
      (app.userInterfaceStyle === 'light' || app.userInterfaceStyle === 'dark')
    ) {
      // the template's DayNight theme follows the system; a locked style
      // takes the matching fixed appcompat theme.
      const dayNight = 'parent="Theme.AppCompat.DayNight.NoActionBar"'
      if (!rendered.includes(dayNight)) {
        throw new Error(
          `[vxrn] cannot lock userInterfaceStyle: expected ${dayNight} in app/src/main/res/values/styles.xml`
        )
      }
      rendered = rendered.replace(
        dayNight,
        app.userInterfaceStyle === 'light'
          ? 'parent="Theme.AppCompat.Light.NoActionBar"'
          : 'parent="Theme.AppCompat.NoActionBar"'
      )
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      (app.android?.permissions?.length || app.android?.blockedPermissions?.length)
    ) {
      const anchor = '<uses-permission android:name="android.permission.INTERNET" />'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp permissions: expected the INTERNET permission in app/src/main/AndroidManifest.xml'
        )
      }
      // a bare name is an android.permission, as expo reads it.
      const permissionName = (name: string) =>
        name.includes('.') ? name : `android.permission.${name}`
      const lines = [
        ...(app.android?.permissions ?? []).map(
          (name) => `    <uses-permission android:name="${permissionName(name)}" />`
        ),
        ...(app.android?.blockedPermissions ?? []).map(
          (name) =>
            `    <uses-permission android:name="${permissionName(name)}" tools:node="remove" />`
        ),
      ]
      rendered = rendered.replace(anchor, `${anchor}\n${lines.join('\n')}`)
      if (app.android?.blockedPermissions?.length && !rendered.includes('xmlns:tools=')) {
        rendered = rendered.replace(
          'xmlns:android="http://schemas.android.com/apk/res/android"',
          'xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"'
        )
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.android?.appLinks?.length
    ) {
      rendered = rendered.replace(
        '      </activity>',
        `        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" />
${app.android.appLinks
  .map(
    (link) =>
      `            <data android:host="${link.host}"${link.pathPrefix ? ` android:pathPrefix="${link.pathPrefix}"` : ''} />`
  )
  .join('\n')}
        </intent-filter>
      </activity>`
      )
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.orientation !== undefined
    ) {
      const anchor = 'android:name=".MainActivity"'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the orientation: expected .MainActivity in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        anchor,
        `${anchor}\n        android:screenOrientation="${app.orientation === 'default' ? 'unspecified' : app.orientation}"`
      )
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.pictureInPicture
    ) {
      const anchor = 'android:name=".MainActivity"'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp picture in picture: expected .MainActivity in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        anchor,
        `${anchor}\n        android:supportsPictureInPicture="true"`
      )
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      schemes.length
    ) {
      rendered = rendered.replace(
        '      </activity>',
        `        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
${schemes.map((scheme) => `            <data android:scheme="${scheme}" />`).join('\n')}
        </intent-filter>
      </activity>`
      )
    }
    if (platform === 'ios' && relativePath.endsWith('.xcodeproj/project.pbxproj')) {
      rendered = rendered.replace(
        /TARGETED_DEVICE_FAMILY = "1,2";/g,
        `TARGETED_DEVICE_FAMILY = "${app.ios?.tablet ? '1,2' : '1'}";`
      )
    }
    // version stamping for One.AppInfo: without it generated projects keep
    // the template defaults (1.0/1) forever. missing manifest fields keep
    // those defaults; a store build must set version, ios.buildNumber, and
    // android.versionCode.
    if (platform === 'ios' && relativePath.endsWith('.xcodeproj/project.pbxproj')) {
      if (app.version !== undefined) {
        rendered = rendered.replace(
          /MARKETING_VERSION = [^;]+;/g,
          `MARKETING_VERSION = "${app.version}";`
        )
      }
      if (app.ios?.buildNumber !== undefined) {
        rendered = rendered.replace(
          /CURRENT_PROJECT_VERSION = [^;]+;/g,
          `CURRENT_PROJECT_VERSION = ${app.ios.buildNumber};`
        )
      }
    }
    if (platform === 'ios' && relativePath.endsWith('.xcodeproj/project.pbxproj') &&
      app.ios?.alternateIcons !== undefined) {
      const anchor = 'ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;'
      if (!rendered.includes(anchor)) {
        throw new Error('[vxrn] prebuild template lost its primary app icon build setting')
      }
      const names = Object.keys(app.ios.alternateIcons).sort().join(' ')
      rendered = rendered.replaceAll(anchor,
        `${anchor}\n\t\t\t\tASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "${names}";`)
    }
    if (platform === 'ios' && relativePath.endsWith('/Info.plist')) {
      // schemes, usesNonExemptEncryption, and fileSharing stamp above in one
      // anchored block; only the usage descriptions stamp here.
      const usage = new Map<string, string>()
      if (app.imagePicker?.camera !== undefined) {
        usage.set('NSCameraUsageDescription', app.imagePicker.camera)
      }
      if (app.photoLibrary !== undefined) {
        if (app.photoLibrary.addOnly !== undefined) {
          usage.set('NSPhotoLibraryAddUsageDescription', app.photoLibrary.addOnly)
        }
        if (app.photoLibrary.readWrite !== undefined) {
          usage.set('NSPhotoLibraryUsageDescription', app.photoLibrary.readWrite)
        }
      }
      if (app.contacts !== undefined) {
        usage.set('NSContactsUsageDescription', app.contacts.usage)
      }
      if (app.calendar !== undefined) {
        if (app.calendar.usage !== undefined) {
          usage.set('NSCalendarsFullAccessUsageDescription', app.calendar.usage)
        }
        if (app.calendar.remindersUsage !== undefined) {
          usage.set('NSRemindersFullAccessUsageDescription', app.calendar.remindersUsage)
        }
      }
      if (app.location !== undefined) {
        usage.set('NSLocationWhenInUseUsageDescription', app.location.whenInUse)
      }
      if (app.ios?.faceIdUsageDescription !== undefined) {
        usage.set('NSFaceIDUsageDescription', app.ios.faceIdUsageDescription)
      }
      if (app.speech !== undefined) {
        usage.set('NSSpeechRecognitionUsageDescription', app.speech.recognition)
        usage.set('NSMicrophoneUsageDescription', app.speech.microphone)
      }
      if (app.audio?.microphone !== undefined) {
        usage.set('NSMicrophoneUsageDescription', app.audio.microphone)
      }
      const additions: [string, string][] = []
      for (const [key, text] of usage) {
        const existing = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)
        if (existing.test(rendered)) {
          rendered = rendered.replace(
            existing,
            (_match, before: string, after: string) => `${before}${escapeXml(text)}${after}`
          )
        } else {
          additions.push([key, text])
        }
      }
      if (additions.length) {
        const anchor = '\t<key>LSRequiresIPhoneOS</key>'
        if (!rendered.includes(anchor)) {
          throw new Error(
            `[vxrn] cannot stamp ${additions[0][0]}: expected LSRequiresIPhoneOS in Info.plist`
          )
        }
        rendered = rendered.replace(
          anchor,
          `${additions.map(([key, text]) => `\t<key>${key}</key>\n\t<string>${escapeXml(text)}</string>\n`).join('')}${anchor}`
        )
      }
      // the template ships an empty location purpose string; an empty one is
      // never valid, so a key the manifest did not fill leaves the plist.
      rendered = rendered.replace(
        /\t<key>NS\w+UsageDescription<\/key>\s*<string><\/string>\n/g,
        ''
      )
      rendered = patchIosInfoPlistSceneManifest(rendered)
    }
    if (platform === 'ios' && relativePath.endsWith('/AppDelegate.swift')) {
      rendered = patchIosAppDelegateSceneLifecycle(
        rendered,
        appName,
        !!app.ios?.backgroundTasks,
        !!app.ios?.appIntents
      )
      rendered = nativeProjectPatches.holdLaunchScreenOverRootView(rendered)
      // the one native template uses hermes. request precompiled dev bytes so
      // lazy routes do not compile on the device while navigation is pending.
      const bundleURLProvider =
        'RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")'
      if (!rendered.includes(bundleURLProvider)) {
        throw new Error(
          '[vxrn] cannot request hermes dev bytecode: expected the template bundle URL provider'
        )
      }
      rendered = rendered.replace(
        bundleURLProvider,
        `guard let bundleURL = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index") else { return nil }
    if bundleURL.isFileURL { return bundleURL }
    var components = URLComponents(url: bundleURL, resolvingAgainstBaseURL: false)!
    components.queryItems!.append(URLQueryItem(name: "bytecode", value: "hermes"))
    return components.url`
      )
      if (app.updates !== undefined) {
        rendered = nativeProjectPatches.pointReleaseBundleURLAtOneUpdates(rendered)
      }
    }
    if (platform === 'ios' && app.ios?.deploymentTarget) {
      rendered = rendered
        .replace(
          'platform :ios, min_ios_version_supported',
          `platform :ios, '${app.ios.deploymentTarget}'`
        )
        .replace(
          /IPHONEOS_DEPLOYMENT_TARGET = \d+(?:\.\d+)?;/g,
          `IPHONEOS_DEPLOYMENT_TARGET = ${app.ios.deploymentTarget};`
        )
      if (relativePath === 'Podfile') {
        rendered = rendered.replace(
          '    )\n  end\nend',
          `    )

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${app.ios.deploymentTarget}'
      end
    end
  end
end`
        )
      }
    }
    if (platform === 'ios' && relativePath.endsWith('.xcodeproj/project.pbxproj')) {
      rendered = patchIosBundlePhase(rendered, app.updates?.runtimeVersion)
      rendered = patchIosPbxprojSceneDelegate(rendered, appName)
      if (app.ios?.appIntents) rendered = patchIosPbxprojAppIntents(rendered, appName)
      rendered = patchIosPbxprojOneBridgingHeader(rendered, appName)
      if (Object.keys(appEntitlements(app)).length && !app.ios?.widgets) {
        rendered = patchIosPbxprojAppEntitlements(rendered, appName)
      }
      if (app.ios?.widgets) rendered = patchIosPbxprojWidgets(rendered, app)
      if (iosResourceFiles(app).length) {
        rendered = patchIosPbxprojResources(rendered, appName, iosResourceFiles(app))
      }
    }
    if (platform === 'ios' && relativePath === 'Podfile') {
      if (app.ios?.ccache) rendered = `ENV['USE_CCACHE'] ||= '1'\n${rendered}`
      if (app.ios?.useFrameworks) {
        rendered = rendered.replace(
          /^(platform :ios, .+)$/m,
          `$1\nuse_frameworks! :linkage => :${app.ios.useFrameworks}`
        )
      }
      if (app.ios?.screensGamma) {
        rendered = nativeProjectPatches.injectReactNativeScreensGammaIntoPodfile(rendered)
      }
      rendered = nativeProjectPatches.injectFmtCxx17FixIntoPodfile(rendered)
      rendered = nativeProjectPatches.injectOneSwiftPackagesIntoPodfile(rendered)
      if (nitroWebImage)
        rendered =
          nativeProjectPatches.injectNitroWebImageModularHeaderIntoPodfile(rendered)
      rendered = nativeProjectPatches.injectHermesMinificationPatchIntoPodfile(rendered)
      if (
        !rendered.includes('[vxrn/one] fmt c++17 fix') ||
        !rendered.includes('[vxrn/one] minify iOS Hermes Release bundle input')
      ) {
        throw new Error('[vxrn] failed to apply required iOS Podfile patches')
      }
    }
    if (platform === 'android' && relativePath === 'app/build.gradle') {
      rendered = nativeProjectPatches.replaceAppBuildGradleReactBlock(rendered)
      rendered = nativeProjectPatches.addDepsPatchToAppBuildGradle(rendered)
      if (
        !rendered.includes('entryFile = file("../../package.json")') ||
        !rendered.includes('[vxrn/one] ensure patches are applied')
      ) {
        throw new Error('[vxrn] failed to apply required Android Gradle patches')
      }
      if (app.updates !== undefined) {
        rendered = patchAndroidBuildGradleUpdatesManifest(
          rendered,
          app.updates.runtimeVersion
        )
      }
      if (app.version !== undefined) {
        rendered = rendered.replace(
          /versionName "[^"]*"/g,
          `versionName "${app.version}"`
        )
      }
      if (app.android?.versionCode !== undefined) {
        rendered = rendered.replace(
          /versionCode \d+/g,
          `versionCode ${app.android.versionCode}`
        )
      }
    }
    if (platform === 'android' && relativePath === 'settings.gradle') {
      const hardcodedGradlePlugin =
        /includeBuild\((['"])\.\.\/node_modules\/@react-native\/gradle-plugin\1\)/g
      if ([...rendered.matchAll(hardcodedGradlePlugin)].length !== 2) {
        throw new Error('[vxrn] expected two React Native Gradle plugin paths')
      }
      rendered = rendered.replace(
        hardcodedGradlePlugin,
        `includeBuild(new File(["node", "--print", "require('module').createRequire(require.resolve('react-native/package.json')).resolve('@react-native/gradle-plugin/package.json')"].execute(null, settingsDir).text.trim()).parentFile.canonicalPath)`
      )
      const autolinkCommand = 'ex.autolinkLibrariesFromCommand()'
      if (rendered.split(autolinkCommand).length !== 2) {
        throw new Error('[vxrn] expected one React Native autolinking command')
      }
      rendered = rendered.replace(
        autolinkCommand,
        `ex.autolinkLibrariesFromCommand(["node", ["node", "--print", "require.resolve('@react-native-community/cli/build/bin.js')"].execute(null, settingsDir).text.trim(), "config"])`
      )
    }
    if (platform === 'android' && relativePath === 'app/build.gradle' && app.android?.minify) {
      const minify = 'def enableProguardInReleaseBuilds = false'
      const minifyEnabled = 'minifyEnabled enableProguardInReleaseBuilds'
      if (!rendered.includes(minify) || !rendered.includes(minifyEnabled)) {
        throw new Error('[vxrn] prebuild template app/build.gradle lost its proguard switch')
      }
      rendered = rendered.replace(minify, 'def enableProguardInReleaseBuilds = true')
      if (app.android.shrinkResources) {
        rendered = rendered.replace(
          minifyEnabled,
          `${minifyEnabled}\n            shrinkResources true`
        )
      }
    }
    if (platform === 'android' && app.android?.googleServicesFile) {
      const edits: Array<[string, string, string]> = [
        [
          'build.gradle',
          'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")',
          `        classpath("com.google.gms:google-services:${GOOGLE_SERVICES_VERSION}")`,
        ],
        [
          'app/build.gradle',
          'apply plugin: "com.facebook.react"',
          'apply plugin: "com.google.gms.google-services"',
        ],
      ]
      for (const [file, anchor, insertion] of edits) {
        if (relativePath !== file) continue
        const next = insertAfterLine(rendered, anchor, insertion)
        if (next === rendered) {
          throw new Error(`[vxrn] prebuild template ${file} lost its ${anchor} anchor`)
        }
        rendered = next
      }
    }
    if (
      platform === 'android' &&
      relativePath === 'app/proguard-rules.pro' &&
      app.android?.proguardRules
    ) {
      rendered = `${rendered.trimEnd()}\n\n${app.android.proguardRules.trim()}\n`
    }
    for (const [field, setting] of [
      ['minSdk', 'minSdkVersion'],
      ['targetSdk', 'targetSdkVersion'],
      ['compileSdk', 'compileSdkVersion'],
    ] as const) {
      const value = platform === 'android' ? app.android?.[field] : undefined
      if (value === undefined) continue
      rendered = rendered.replace(new RegExp(`${setting} = \\d+`, 'g'), `${setting} = ${value}`)
    }
  }

  return { destRelativePath, content: rendered }
}

export const generateForPlatform = async (
  root: string,
  platform: 'ios' | 'android',
  app: NativeAppManifest,
  outDir: string = path.resolve(root, platform)
) => {
  validatePrebuildApp(app, platform)
  const dest = outDir
  const require = module.createRequire(root + '/')
  const importPath = require.resolve('@react-native-community/cli/build/tools/walk.js', {
    paths: [root],
  })
  const src = path.join(
    path.dirname(
      require.resolve('@react-native-community/template/template/package.json', {
        paths: [root],
      })
    ),
    platform
  )
  // cjs/esm interop differs between runtimes (node vs bundled workers), so
  // resolve the walk function defensively instead of assuming one shape.
  const walkModule = (await import(pathToFileURL(importPath).href)) as any
  const walkFn = walkModule?.default?.default ?? walkModule?.default ?? walkModule
  if (typeof walkFn !== 'function') {
    throw new Error('[vxrn] could not resolve the community template walker')
  }
  const files: string[] = [...walkFn(src)].sort()
  const nitroWebImage = platform === 'ios' && nativeProjectPatches.hasNitroWebImage(root)

  // owned output: regenerate from the manifest so reruns reproduce bytes.
  FSExtra.removeSync(dest)

  for (const absoluteSrc of files) {
    const relativeFilePath = path.relative(src, absoluteSrc)
    const stat = FSExtra.lstatSync(absoluteSrc)
    if (stat.isDirectory()) continue

    const extension = path.extname(absoluteSrc)
    const raw = ['.png', '.jar', '.keystore'].includes(extension)
      ? null
      : FSExtra.readFileSync(absoluteSrc, 'utf8')
    const { destRelativePath, content } = renderPrebuildFile({
      relativePath: relativeFilePath,
      content: raw,
      platform,
      app,
      nitroWebImage,
    })
    const destPath = path.resolve(dest, destRelativePath)
    FSExtra.mkdirSync(path.dirname(destPath), { recursive: true })

    console.info('copying', '"' + absoluteSrc + '"', 'to', '"' + destPath + '"')

    if (content === null) {
      FSExtra.copyFileSync(absoluteSrc, destPath)
      continue
    }
    FSExtra.writeFileSync(destPath, content, {
      encoding: 'utf8',
      mode: stat.mode,
    })
  }

  await generateAppIcons({ root, dest, platform, app })
  if (platform === 'android') await generateAdaptiveIcon({ root, dest, app })
  await generateSplashScreen({ root, dest, platform, app })
  if (platform === 'ios') generateAccentColor({ dest, app })
  copyAppResources({ root, dest, platform, app })
  generateSceneDelegate({ dest, platform, app })
  generateIosAppIntents(dest, platform, app)
  if (platform === 'ios') generateOneBridgingHeader(dest, app)
  if (platform === 'ios') generateIosWidgets(dest, app)
  if (platform === 'ios') await generateSwiftPackages({ root, dest })
  if (platform === 'android') await generateKotlinSources({ root, dest })
}

export function enableAppComposeIntegration(dest: string) {
  const rootBuildGradlePath = path.join(dest, 'build.gradle')
  if (FSExtra.existsSync(rootBuildGradlePath)) {
    let content = FSExtra.readFileSync(rootBuildGradlePath, 'utf8')
    const composePluginClasspath =
      '        classpath("org.jetbrains.kotlin.plugin.compose:org.jetbrains.kotlin.plugin.compose.gradle.plugin:$kotlinVersion")'
    if (!content.includes('org.jetbrains.kotlin.plugin.compose')) {
      const anchor = content.includes('classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")')
        ? 'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")'
        : 'classpath "org.jetbrains.kotlin:kotlin-gradle-plugin"'
      content = insertAfterLine(content, anchor, composePluginClasspath)
      FSExtra.writeFileSync(rootBuildGradlePath, content, 'utf8')
    }
  }

  const appBuildGradlePath = path.join(dest, 'app/build.gradle')
  if (FSExtra.existsSync(appBuildGradlePath)) {
    let content = FSExtra.readFileSync(appBuildGradlePath, 'utf8')
    if (!content.includes('org.jetbrains.kotlin.plugin.compose')) {
      const pluginAnchor = content.includes('apply plugin: "org.jetbrains.kotlin.android"')
        ? 'apply plugin: "org.jetbrains.kotlin.android"'
        : "apply plugin: 'org.jetbrains.kotlin.android'"
      content = insertAfterLine(
        content,
        pluginAnchor,
        'apply plugin: "org.jetbrains.kotlin.plugin.compose"'
      )
    }
    if (!content.includes('compose true')) {
      content = insertAfterLine(
        content,
        'android {',
        '    buildFeatures {\n        compose true\n    }'
      )
    }
    if (!content.includes('androidx.compose.ui:ui')) {
      const composeDeps = [
        '    def composeUiVersion = rootProject.ext.has("composeUiVersion") ? rootProject.ext.get("composeUiVersion") : "1.11.4"',
        '    def material3Version = rootProject.ext.has("material3Version") ? rootProject.ext.get("material3Version") : "1.5.0-alpha17"',
        '    implementation "androidx.compose.ui:ui:$composeUiVersion"',
        '    implementation "androidx.compose.foundation:foundation:$composeUiVersion"',
        '    implementation "androidx.compose.material3:material3:$material3Version"',
      ].join('\n')
      const depsAnchor = content.includes('implementation("com.facebook.react:react-android")')
        ? 'implementation("com.facebook.react:react-android")'
        : 'implementation "com.facebook.react:react-android"'
      content = insertAfterLine(content, depsAnchor, composeDeps)
    }
    FSExtra.writeFileSync(appBuildGradlePath, content, 'utf8')
  }
}

// the native source contract loads only for an app that has kotlin or swift
// sources to generate glue for.
export async function generateKotlinSources({ root, dest }: { root: string; dest: string }) {
  const skip = new Set(['node_modules', 'ios', 'android', 'dist', 'types', 'build', 'tests', '__tests__', 'scripts'])
  const sources: string[] = []
  const collect = (dir: string) => {
    // nested javascript packages own their native sources, including fixtures.
    if (dir !== root && FSExtra.existsSync(path.join(dir, 'package.json'))) return
    for (const entry of FSExtra.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || skip.has(entry.name)) continue
      const source = path.join(dir, entry.name)
      if (entry.isDirectory()) collect(source)
      else if (entry.isFile() && entry.name.endsWith('.kt')) sources.push(source)
    }
  }
  collect(root)
  if (sources.length === 0) return
  const { kotlinSourceId, renderKotlinSourceGlue, writeNativeSourceDeclaration } = await import(
    '../utils/nativeSourceContract'
  )
  let hasViews = false
  for (const source of sources) {
    const id = kotlinSourceId(root, source)
    const target = path.join(dest, 'app/src/main/java/one/source', id)
    FSExtra.mkdirSync(target, { recursive: true })
    FSExtra.copyFileSync(source, path.join(target, path.basename(source)))
    const contract = writeNativeSourceDeclaration(source)
    if (contract.views.length > 0) hasViews = true
    if (contract.modules.length > 0 || contract.views.length > 0) {
      FSExtra.writeFileSync(
        path.join(target, `OneNativeSource_${id}.kt`),
        renderKotlinSourceGlue(id, contract).source
      )
    }
  }
  if (hasViews) {
    enableAppComposeIntegration(dest)
  }
}

// every directory under the app root holding a Package.swift becomes one local
// pod: its sources compile as their own module against One (which
// supplies RNXPackage and JSON), the @main entry is renamed so it does not
// clash with the app's main, and an objc +load files the entry with the
// registry the OneSwiftHost view reads. the bundler resolves an import of any
// .swift file in the package to a host view naming the same package id.
async function generateSwiftPackages({ root, dest }: { root: string; dest: string }) {
  const skip = new Set(['node_modules', 'ios', 'android', 'dist', 'types', 'build'])
  const packages = swiftPackageDirectories(root)
  if (packages.size === 0) return
  const { swiftPodManifest, writeSwiftPackageArtifacts } = await import('../utils/nativeSourceContract')
  for (const [id, packageDir] of packages) {
    const podDir = path.join(dest, 'OneSwiftPackages', id)
    const manifest = swiftPodManifest(
      path.join(packageDir, 'Package.swift'),
      FSExtra.readFileSync(path.join(packageDir, 'Package.swift'), 'utf8')
    )
    const sources: string[] = []
    const collect = (dir: string) => {
      for (const entry of FSExtra.readdirSync(dir, { withFileTypes: true })) {
        // a package at the app root holds the generated native projects too
        if (entry.name.startsWith('.') || skip.has(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) collect(full)
        else if (entry.name.endsWith('.swift') && entry.name !== 'Package.swift')
          sources.push(full)
      }
    }
    collect(packageDir)
    const artifacts = writeSwiftPackageArtifacts(packageDir)
    const contracts = artifacts.contracts
    const hasView = contracts.some((contract) => contract.defaultView)
    if (contracts.filter((contract) => contract.defaultView).length > 1) {
      throw new Error(`[vxrn] swift package ${packageDir} has more than one @main type`)
    }
    // cocoapods globs do not descend into symlinked directories, so mirror the
    // tree with real directories and link each file.
    for (const source of sources) {
      const link = path.join(podDir, 'Sources', path.relative(packageDir, source))
      FSExtra.mkdirSync(path.dirname(link), { recursive: true })
      FSExtra.symlinkSync(FSExtra.realpathSync(source), link)
    }
    if (contracts.some((contract) => contract.modules.length > 0)) {
      FSExtra.writeFileSync(
        path.join(podDir, 'Sources', 'OneNativeSource.generated.swift'),
        artifacts.glue
      )
    }
    FSExtra.writeFileSync(
      path.join(podDir, `${id}.podspec`),
      `Pod::Spec.new do |s|
  s.name = '${id}'
  s.version = '0.0.0'
  s.summary = 'swift package ${path.relative(root, packageDir) || '.'}'
  s.homepage = 'https://onestack.dev'
  s.license = 'MIT'
  s.author = 'one'
  s.source = { :path => '.' }
  s.swift_version = '${manifest.languageMode}.0'
  s.source_files = 'Sources/**/*.swift', 'Register.m'
  s.dependency 'One'
  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '$(inherited) -cxx-interoperability-mode=default -Xcc -std=c++20 -Xfrontend -import-module -Xfrontend One${manifest.mainActorIsolation ? ' -default-isolation MainActor' : ''}${hasView ? ` -Xfrontend -entry-point-function-name -Xfrontend ${id}_main` : ''}',
  }
end
`
    )
    FSExtra.writeFileSync(
      path.join(podDir, 'Register.m'),
      hasView ? `#import <Foundation/Foundation.h>

extern int ${id}_main(int argc, char **argv);
extern void OneSwiftRegisterPackage(const char *name, int (*entry)(int, char **));

@interface OneSwiftPackage_${id} : NSObject
@end

@implementation OneSwiftPackage_${id}
+ (void)load {
  OneSwiftRegisterPackage("${id}", ${id}_main);
}
@end
` : '#import <Foundation/Foundation.h>\n'
    )
  }
}

export interface NativeDependencyInventory {
  name: string
  version: string
  platforms: string[]
}

export function applyAndroidDependencyPatches(args: {
  root: string
  app: NativeAppManifest
  inventory: readonly NativeDependencyInventory[]
}): void {
  const { root, app, inventory } = args
  if (
    !app.android ||
    !inventory.some(
      (dependency) =>
        dependency.name === 'react-native-screens' &&
        dependency.platforms.includes('android')
    )
  ) {
    return
  }

  const activityPath = path.join(
    root,
    'android',
    'app',
    'src',
    'main',
    'java',
    ...app.android.applicationId.split('.'),
    'MainActivity.kt'
  )
  const rendered = nativeProjectPatches.holdLaunchScreenInMainActivity(
    nativeProjectPatches.addReactNativeScreensFix(FSExtra.readFileSync(activityPath, 'utf8'))
  )
  if (!rendered.includes('RNScreensFragmentFactory')) {
    throw new Error('[vxrn] failed to apply the react-native-screens activity patch')
  }
  FSExtra.writeFileSync(activityPath, rendered)
}

// use the community cli's final configuration so project-owned dependency
// roots and platform overrides match what cocoapods and gradle will link.
export async function getNativeDependencyInventory(
  root: string
): Promise<NativeDependencyInventory[]> {
  const require = module.createRequire(root + '/')
  const cliConfigPath = require.resolve('@react-native-community/cli-config', {
    paths: [root],
  })
  const cliConfig = (await import(pathToFileURL(cliConfigPath).href)) as {
    loadConfigAsync: (options: { projectRoot: string }) => Promise<{
      dependencies: Record<
        string,
        {
          root: string
          platforms: Record<string, unknown>
        }
      >
    }>
  }
  const config = await cliConfig.loadConfigAsync({ projectRoot: root })
  const inventory: NativeDependencyInventory[] = []
  for (const name of Object.keys(config.dependencies).sort()) {
    const dependency = config.dependencies[name]
    const depRoot = dependency.root
    let version = 'unknown'
    try {
      version =
        JSON.parse(FSExtra.readFileSync(path.join(depRoot, 'package.json'), 'utf8'))
          .version ?? 'unknown'
    } catch {}
    const platforms = Object.entries(dependency.platforms)
      .filter(([, platformConfig]) => platformConfig !== null)
      .map(([platform]) => platform)
      .sort()
    if (platforms.length > 0) inventory.push({ name, version, platforms })
  }
  return inventory
}

// installs through the selected tooling: cocoapods for ios (which also runs
// native codegen), nothing extra for android (codegen runs at gradle build).
// `--no-install` skips installation but never fakes discovery output.
export function installNativeDependencies(args: {
  root: string
  platform?: 'ios' | 'android' | string
}): void {
  const { root, platform } = args
  if (!platform || platform === 'ios') {
    execFileSync('pod', ['install', `--project-directory=${path.join(root, 'ios')}`], {
      stdio: 'inherit',
    })
  }
}

const transformPath = (filePath: string) => {
  return filePath
    .replace('_BUCK', 'BUCK')
    .replace('_gitignore', '.gitignore')
    .replace('_gitattributes', '.gitattributes')
    .replace('_babelrc', '.babelrc')
    .replace('_editorconfig', '.editorconfig')
    .replace('_eslintrc.js', '.eslintrc.js')
    .replace('_flowconfig', '.flowconfig')
    .replace('_buckconfig', '.buckconfig')
    .replace('_prettierrc.js', '.prettierrc.js')
    .replace('_bundle', '.bundle')
    .replace('_ruby-version', '.ruby-version')
    .replace('_node-version', '.node-version')
    .replace('_watchmanconfig', '.watchmanconfig')
    .replace('_xcode.env', '.xcode.env')
}
