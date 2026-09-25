import { execFileSync } from 'node:child_process'
import module from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateNativeApp, type NativeAppManifest } from '@vxrn/utils/nativeAppManifest'
import FSExtra from 'fs-extra'
import sharp from 'sharp'
import { swiftPackageId } from '../utils/swiftPackageId'

type NativeProjectPatches = {
  addSetCliPathToBundleReactNativeShellScript(input: string): string
  addPodHermescToBundleReactNativeShellScript(input: string): string
  addDepsPatchToBundleReactNativeShellScript(input: string): string
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

/*
This code block is partially copied from meta owned repos.
Copyright (c) Facebook, Inc. and its affiliates.
*/

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

function patchIosBundlePhase(project: string): string {
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

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

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

function patchIosAppDelegateSceneLifecycle(rendered: string, appName: string): string {
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
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    true
  }

  // remote push answers land here; the notifications module observes the
  // forward. inert unless something calls registerForRemoteNotifications.
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    NotificationCenter.default.post(
      name: NSNotification.Name("OneNativePushTokenDidRegister"),
      object: nil,
      userInfo: ["deviceToken": deviceToken]
    )
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NotificationCenter.default.post(
      name: NSNotification.Name("OneNativePushTokenDidFail"),
      object: nil,
      userInfo: ["error": error.localizedDescription]
    )
  }
}`
  )
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

function patchIosPbxprojPushEntitlements(rendered: string, appName: string): string {
  // the aps-environment entitlement only when the app opts into push. the
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

function renderPushEntitlements(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>aps-environment</key>
\t<string>development</string>
</dict>
</plist>
`
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
  // widgets use the same app entitlement file for the app group and apns.
  // without widgets, push gets its own entitlement file.
  if (app.notifications?.push === true && !app.ios?.widgets) {
    FSExtra.writeFileSync(
      path.join(dest, app.name, `${app.name}.entitlements`),
      renderPushEntitlements()
    )
  }
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
    widgets.pushNotifications || app.notifications?.push
      ? entitlements.replace(
          '</dict></plist>',
          '<key>aps-environment</key><string>development</string></dict></plist>'
        )
      : entitlements
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

async function generateAppIcons(args: {
  root: string
  dest: string
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): Promise<void> {
  const { root, dest, platform, app } = args
  if (!app.icon) return

  const source = path.resolve(root, app.icon.source)
  if (!FSExtra.existsSync(source)) {
    throw new Error(`[vxrn] native.app.icon source does not exist: ${source}`)
  }
  const metadata = await sharp(source).metadata()
  if (
    metadata.width === undefined ||
    metadata.height === undefined ||
    metadata.width !== metadata.height ||
    metadata.width < 1024
  ) {
    throw new Error(
      '[vxrn] native.app.icon source must be a square image at least 1024px wide'
    )
  }

  if (platform === 'ios') {
    const iconDir = path.join(dest, app.name, 'Images.xcassets', 'AppIcon.appiconset')
    const contentsPath = path.join(iconDir, 'Contents.json')
    const contents: {
      images: Array<{ idiom: string; scale: string; size: string; filename?: string }>
      info: { author: string; version: number }
    } = JSON.parse(FSExtra.readFileSync(contentsPath, 'utf8'))
    for (const image of contents.images) {
      const points = Number.parseFloat(image.size.split('x')[0])
      const scale = Number.parseInt(image.scale, 10)
      const pixels = points * scale
      const filename =
        image.idiom === 'ios-marketing'
          ? 'icon-1024.png'
          : `icon-${points}@${image.scale}.png`
      image.filename = filename
      await sharp(source)
        .rotate()
        .resize(pixels, pixels, { fit: 'cover' })
        .flatten({ background: app.icon.backgroundColor })
        .png()
        .toFile(path.join(iconDir, filename))
    }
    FSExtra.writeFileSync(contentsPath, `${JSON.stringify(contents, null, 2)}\n`)
    return
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

async function generateSplashScreen(args: {
  root: string
  dest: string
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): Promise<void> {
  const { root, dest, platform, app } = args
  if (!app.splash) return

  const source = path.resolve(root, app.splash.source)
  if (!FSExtra.existsSync(source)) {
    throw new Error(`[vxrn] native.app.splash source does not exist: ${source}`)
  }
  const { data: artwork, info: metadata } = await sharp(source)
    .rotate()
    .trim({ background: app.splash.backgroundColor })
    .png()
    .toBuffer({ resolveWithObject: true })
  if (!metadata.width || !metadata.height) {
    throw new Error('[vxrn] native.app.splash source must be an image')
  }
  const artworkWidth = app.splash.width ?? 200
  const artworkHeight = Number(
    (artworkWidth * (metadata.height / metadata.width)).toFixed(3)
  )

  if (platform === 'ios') {
    const appDir = path.join(dest, app.name)
    const splashDir = path.join(appDir, 'Images.xcassets', 'Splash.imageset')
    FSExtra.mkdirSync(splashDir, { recursive: true })
    await sharp(artwork).toFile(path.join(splashDir, 'splash.png'))
    FSExtra.writeFileSync(
      path.join(splashDir, 'Contents.json'),
      `${JSON.stringify(
        {
          images: [{ filename: 'splash.png', idiom: 'universal', scale: '1x' }],
          info: { author: 'xcode', version: 1 },
        },
        null,
        2
      )}\n`
    )
    const red = Number.parseInt(app.splash.backgroundColor.slice(1, 3), 16) / 255
    const green = Number.parseInt(app.splash.backgroundColor.slice(3, 5), 16) / 255
    const blue = Number.parseInt(app.splash.backgroundColor.slice(5, 7), 16) / 255
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
            <subviews>
              <imageView userInteractionEnabled="NO" contentMode="scaleAspectFit" image="Splash" translatesAutoresizingMaskIntoConstraints="NO" id="splash-image"/>
            </subviews>
            <color key="backgroundColor" red="${red}" green="${green}" blue="${blue}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
            <constraints>
              <constraint firstItem="splash-image" firstAttribute="centerX" secondItem="launch-view" secondAttribute="centerX" id="splash-center-x"/>
              <constraint firstItem="splash-image" firstAttribute="centerY" secondItem="launch-view" secondAttribute="centerY" id="splash-center-y"/>
              <constraint firstItem="splash-image" firstAttribute="width" constant="${artworkWidth}" id="splash-width"/>
              <constraint firstItem="splash-image" firstAttribute="height" constant="${artworkHeight}" id="splash-height"/>
            </constraints>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="launch-responder" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
  <resources>
    <image name="Splash" width="${metadata.width}" height="${metadata.height}"/>
  </resources>
</document>
`
    )
    return
  }

  const mainRes = path.join(dest, 'app', 'src', 'main', 'res')
  const drawable = path.join(mainRes, 'drawable')
  for (const [density, multiplier] of Object.entries(ANDROID_DENSITIES)) {
    const canvasSize = 288 * multiplier
    const imageSize = Math.round(artworkWidth * multiplier)
    const contained = await sharp(artwork)
      .resize(imageSize, imageSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
    const drawableDensity = path.join(mainRes, `drawable-${density}`)
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
      if (app.ios?.fileSharing) {
        stamps.push(
          `\t<key>UIFileSharingEnabled</key>\n\t<true/>\n\t<key>LSSupportsOpeningDocumentsInPlace</key>\n\t<true/>`
        )
      }
      if (app.notifications !== undefined) {
        // gates the UNUserNotificationCenter delegate install: apps that link
        // one without notifications keep whatever delegate their own
        // push library sets.
        stamps.push(`\t<key>OneNativeNotificationsEnabled</key>\n\t<true/>`)
      }
      if (app.notifications?.push === true) {
        // without the aps-environment entitlement the simulator never answers
        // registerForRemoteNotifications, so the token getter reads this to
        // reject at once like android's nopush flavor.
        stamps.push(`\t<key>OneNativeNotificationsPush</key>\n\t<true/>`)
      }
      if (app.ios?.widgets) {
        stamps.push('\t<key>NSSupportsLiveActivities</key>\n\t<true/>')
      }
      if (app.pictureInPicture) {
        stamps.push(
          '\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>audio</string>\n\t</array>'
        )
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
      app.imagePicker?.camera !== undefined
    ) {
      const anchor = '<uses-permission android:name="android.permission.INTERNET" />'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the camera permission: expected the INTERNET permission in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        anchor,
        `${anchor}\n    <uses-permission android:name="android.permission.CAMERA" />`
      )
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
        `${anchor}\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />`
      )
      if (!rendered.includes('android.permission.POST_NOTIFICATIONS')) {
        throw new Error(
          '[vxrn] failed to stamp notification permissions into app manifest'
        )
      }
      // the alarm and boot receiver lives in the app manifest, never the
      // library one, so apps without notifications gain nothing. alarms
      // arrive as explicit intents; only boot needs the filter.
      rendered = rendered.replace(
        '      </activity>\n    </application>',
        '      </activity>\n      <receiver android:name="dev.onejs.onenative.OneNativeNotificationsReceiver" android:exported="false">\n          <intent-filter>\n              <action android:name="android.intent.action.BOOT_COMPLETED" />\n          </intent-filter>\n      </receiver>\n    </application>'
      )
      if (!rendered.includes('OneNativeNotificationsReceiver')) {
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
      const anchor = 'dev.onejs.onenative.OneNativeNotificationsReceiver'
      if (!rendered.includes(anchor)) {
        throw new Error(
          '[vxrn] cannot stamp the push service: expected the notification receiver in app/src/main/AndroidManifest.xml'
        )
      }
      rendered = rendered.replace(
        '      </receiver>\n    </application>',
        '      </receiver>\n      <service android:name="dev.onejs.onenative.OneNativePushService" android:exported="false">\n          <intent-filter>\n              <action android:name="com.google.firebase.MESSAGING_EVENT" />\n          </intent-filter>\n      </service>\n    </application>'
      )
      if (!rendered.includes('OneNativePushService')) {
        throw new Error('[vxrn] failed to stamp the push service into app manifest')
      }
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
      const line = 'oneNativePush=true'
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
    if (platform === 'ios' && relativePath.endsWith('/Info.plist')) {
      // schemes, usesNonExemptEncryption, and fileSharing stamp above in one
      // anchored block; only the camera description stamps here.
      if (app.imagePicker?.camera !== undefined) {
        const anchor = '\t<key>LSRequiresIPhoneOS</key>'
        if (!rendered.includes(anchor)) {
          throw new Error(
            '[vxrn] cannot stamp NSCameraUsageDescription: expected LSRequiresIPhoneOS in Info.plist'
          )
        }
        rendered = rendered.replace(
          anchor,
          `\t<key>NSCameraUsageDescription</key>\n\t<string>${escapeXml(app.imagePicker.camera)}</string>\n${anchor}`
        )
      }
      rendered = patchIosInfoPlistSceneManifest(rendered)
    }
    if (platform === 'ios' && relativePath.endsWith('/AppDelegate.swift')) {
      rendered = patchIosAppDelegateSceneLifecycle(rendered, appName)
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
      rendered = patchIosBundlePhase(rendered)
      rendered = patchIosPbxprojSceneDelegate(rendered, appName)
      if (app.notifications?.push === true && !app.ios?.widgets) {
        rendered = patchIosPbxprojPushEntitlements(rendered, appName)
      }
      if (app.ios?.widgets) rendered = patchIosPbxprojWidgets(rendered, app)
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
    }
    if (platform === 'android' && app.android?.minSdk !== undefined) {
      rendered = rendered.replace(
        /minSdkVersion = \d+/g,
        `minSdkVersion = ${app.android.minSdk}`
      )
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
  await generateSplashScreen({ root, dest, platform, app })
  generateSceneDelegate({ dest, platform, app })
  if (platform === 'ios') generateIosWidgets(dest, app)
  if (platform === 'ios') generateSwiftPackages({ root, dest })
}

// every directory under the app root holding a Package.swift becomes one local
// pod: its sources compile as their own module against One (which
// supplies RNXPackage and JSON), the @main entry is renamed so it does not
// clash with the app's main, and an objc +load files the entry with the
// registry the OneSwiftHost view reads. the bundler resolves an import of any
// .swift file in the package to a host view naming the same package id.
function generateSwiftPackages({ root, dest }: { root: string; dest: string }) {
  const skip = new Set(['node_modules', 'ios', 'android', 'dist', 'types', 'build'])
  const packageDirs: string[] = []
  const walk = (dir: string) => {
    const entries = FSExtra.readdirSync(dir, { withFileTypes: true })
    if (entries.some((entry) => entry.isFile() && entry.name === 'Package.swift')) {
      packageDirs.push(dir)
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || skip.has(entry.name))
        continue
      walk(path.join(dir, entry.name))
    }
  }
  walk(root)

  for (const packageDir of packageDirs) {
    const id = swiftPackageId(packageDir)
    const podDir = path.join(dest, 'OneSwiftPackages', id)
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
    // cocoapods globs do not descend into symlinked directories, so mirror the
    // tree with real directories and link each file.
    for (const source of sources) {
      const link = path.join(podDir, 'Sources', path.relative(packageDir, source))
      FSExtra.mkdirSync(path.dirname(link), { recursive: true })
      FSExtra.symlinkSync(FSExtra.realpathSync(source), link)
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
  s.swift_version = '6.0'
  s.source_files = 'Sources/**/*.swift', 'Register.m'
  s.dependency 'One'
  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '$(inherited) -cxx-interoperability-mode=default -Xcc -std=c++20 -Xfrontend -import-module -Xfrontend One -Xfrontend -entry-point-function-name -Xfrontend ${id}_main',
  }
end
`
    )
    FSExtra.writeFileSync(
      path.join(podDir, 'Register.m'),
      `#import <Foundation/Foundation.h>

extern int ${id}_main(int argc, char **argv);
extern void OneSwiftRegisterPackage(const char *name, int (*entry)(int, char **));

@interface OneSwiftPackage_${id} : NSObject
@end

@implementation OneSwiftPackage_${id}
+ (void)load {
  OneSwiftRegisterPackage("${id}", ${id}_main);
}
@end
`
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
  const rendered = nativeProjectPatches.addReactNativeScreensFix(
    FSExtra.readFileSync(activityPath, 'utf8')
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
