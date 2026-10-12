const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const nativeProjectPatches = require('./native-project-patches.cjs')

// options: { notifications: { push?: boolean, mode?: 'development' | 'production' } }
// turns on One.Notifications the way native.app.notifications does for one
// prebuild. mode is the aps-environment, as expo-notifications takes it.
//
// options: { updates: { url?: string, runtimeVersion: string } } turns on
// One.Updates on iOS the way native.app.updates does for one prebuild: the
// release bundleURL asks the launcher, and the bundle phase writes the
// embedded manifest. Expo's Android host builds its own ReactHost delegate,
// which One.Updates cannot re-point, so Android needs one prebuild.
//
// options: { holdLaunchScreen: true } keeps the launch storyboard over the
// react native root until its first content, and MainActivity's content
// from drawing until then on Android, as one prebuild always does. leave it
// off while expo-splash-screen owns the splash.
// options: { location: { whenInUse: string, background?: boolean } } sets the ios
// location prompt and optional background mode.
// options: { audio: { microphone?: string, background?: boolean } } sets the
// ios recording prompt and background audio mode.
// options: { photoLibrary: { addOnly?: string, readWrite?: string } } sets ios photos prompts.
// options: { contacts: { usage: string } } sets the ios contacts prompt.
// options: { calendar: { usage?: string, remindersUsage?: string } } sets EventKit prompts.
// options: { nativeSource: true } generates the One native-source glue into
// the Expo prebuilt project the way one prebuild does: a local pod per Swift
// package under ios/OneSwiftPackages (plus the Podfile glob one prebuild
// writes) and the Kotlin sources plus their glue under
// android/app/src/main/java/one/source. Swift and Kotlin imports then bundle
// the same host modules; without this the bundler keeps failing fast with
// the one-prebuild error.
module.exports = function withVxrn(config, options = {}) {
  const projectRoot = config?._internal?.projectRoot
  if (!projectRoot) {
    throw new Error('[vxrn/expo-plugin] Expo config is missing _internal.projectRoot')
  }

  const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
  const {
    AndroidConfig,
    withAndroidManifest,
    withAppBuildGradle,
    withAppDelegate,
    withDangerousMod,
    withEntitlementsPlist,
    withGradleProperties,
    withInfoPlist,
    withMainActivity,
    withMainApplication,
    withPlugins,
    withXcodeProject,
  } = projectRequire('@expo/config-plugins')

  const notifications = options.notifications
  const location = options.location
  const audio = options.audio
  const photoLibrary = options.photoLibrary
  const contacts = options.contacts
  const calendar = options.calendar
  const nativeSource = options.nativeSource
  if (nativeSource !== undefined && typeof nativeSource !== 'boolean') {
    throw new Error('[vxrn/expo-plugin] nativeSource must be a boolean')
  }
  if (
    location &&
    (typeof location.whenInUse !== 'string' || !location.whenInUse.trim())
  ) {
    throw new Error('[vxrn/expo-plugin] location.whenInUse must be a non-empty string')
  }
  if (location?.background !== undefined && typeof location.background !== 'boolean') {
    throw new Error('[vxrn/expo-plugin] location.background must be a boolean')
  }
  if (audio !== undefined) {
    if (!audio || typeof audio !== 'object') {
      throw new Error('[vxrn/expo-plugin] audio must configure microphone or background playback')
    }
    if (audio.microphone !== undefined &&
      (typeof audio.microphone !== 'string' || !audio.microphone.trim())) {
      throw new Error('[vxrn/expo-plugin] audio.microphone must be a non-empty string')
    }
    if (audio.background !== undefined && typeof audio.background !== 'boolean') {
      throw new Error('[vxrn/expo-plugin] audio.background must be a boolean')
    }
    if (audio.microphone === undefined && audio.background !== true) {
      throw new Error('[vxrn/expo-plugin] audio must configure microphone or background playback')
    }
  }
  if (
    photoLibrary !== undefined &&
    (!photoLibrary ||
      (photoLibrary.addOnly === undefined && photoLibrary.readWrite === undefined))
  ) {
    throw new Error('[vxrn/expo-plugin] photoLibrary must configure addOnly or readWrite')
  }
  if (photoLibrary?.addOnly !== undefined &&
    (typeof photoLibrary.addOnly !== 'string' || !photoLibrary.addOnly.trim())) {
    throw new Error('[vxrn/expo-plugin] photoLibrary.addOnly must be a non-empty string')
  }
  if (photoLibrary?.readWrite !== undefined &&
    (typeof photoLibrary.readWrite !== 'string' || !photoLibrary.readWrite.trim())) {
    throw new Error('[vxrn/expo-plugin] photoLibrary.readWrite must be a non-empty string')
  }
  if (
    contacts !== undefined &&
    (!contacts || typeof contacts.usage !== 'string' || !contacts.usage.trim())
  ) {
    throw new Error('[vxrn/expo-plugin] contacts.usage must be a non-empty string')
  }
  if (calendar !== undefined) {
    if (!calendar || (calendar.usage === undefined && calendar.remindersUsage === undefined)) {
      throw new Error('[vxrn/expo-plugin] calendar.usage or calendar.remindersUsage is required')
    }
    if (calendar.usage !== undefined &&
      (typeof calendar.usage !== 'string' || !calendar.usage.trim())) {
      throw new Error('[vxrn/expo-plugin] calendar.usage must be a non-empty string')
    }
    if (calendar.remindersUsage !== undefined &&
      (typeof calendar.remindersUsage !== 'string' || !calendar.remindersUsage.trim())) {
      throw new Error('[vxrn/expo-plugin] calendar.remindersUsage must be a non-empty string')
    }
  }
  const locationPlugins = !location
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            nextConfig.modResults.NSLocationWhenInUseUsageDescription = location.whenInUse
            if (location.background === true) {
              const modes = nextConfig.modResults.UIBackgroundModes || []
              nextConfig.modResults.UIBackgroundModes = [...new Set([...modes, 'location'])]
            }
            return nextConfig
          },
        ],
        [
          withAndroidManifest,
          (nextConfig) => {
            const manifest = nextConfig.modResults.manifest
            manifest['uses-permission'] ??= []
            const names = [
              'android.permission.ACCESS_COARSE_LOCATION',
              'android.permission.ACCESS_FINE_LOCATION',
            ]
            if (location.background === true) {
              names.push('android.permission.ACCESS_BACKGROUND_LOCATION')
            }
            for (const name of names) {
              if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
                manifest['uses-permission'].push({ $: { 'android:name': name } })
              }
            }
            return nextConfig
          },
        ],
      ]
  const audioPlugins = !audio
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            if (audio.microphone !== undefined) {
              nextConfig.modResults.NSMicrophoneUsageDescription = audio.microphone
            }
            if (audio.background === true) {
              const modes = nextConfig.modResults.UIBackgroundModes || []
              nextConfig.modResults.UIBackgroundModes = [...new Set([...modes, 'audio'])]
            }
            return nextConfig
          },
        ],
      ]
  const photoLibraryPlugins = !photoLibrary
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            if (photoLibrary.addOnly !== undefined)
              nextConfig.modResults.NSPhotoLibraryAddUsageDescription = photoLibrary.addOnly
            if (photoLibrary.readWrite !== undefined) {
              nextConfig.modResults.NSPhotoLibraryUsageDescription = photoLibrary.readWrite
              nextConfig.modResults.PHPhotoLibraryPreventAutomaticLimitedAccessAlert = true
            }
            return nextConfig
          },
        ],
      ]
  const contactsPlugins = !contacts
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            nextConfig.modResults.NSContactsUsageDescription = contacts.usage
            return nextConfig
          },
        ],
      ]
  const calendarPlugins = !calendar
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            if (calendar.usage) {
              nextConfig.modResults.NSCalendarsFullAccessUsageDescription = calendar.usage
            }
            if (calendar.remindersUsage) {
              nextConfig.modResults.NSRemindersFullAccessUsageDescription = calendar.remindersUsage
            }
            return nextConfig
          },
        ],
      ]
  // mirrors one prebuild's Android media stamps: the same permissions,
  // meta-data markers and audio service from the same option fields.
  const mediaPlugins =
    audio === undefined &&
    photoLibrary === undefined &&
    contacts === undefined &&
    calendar === undefined
      ? []
      : [
          [
            withAndroidManifest,
            (nextConfig) => {
              const manifest = nextConfig.modResults.manifest
              manifest['uses-permission'] ??= []
              const ensurePermission = (name, maxSdkVersion) => {
                if (
                  manifest['uses-permission'].some((p) => p.$['android:name'] === name)
                )
                  return
                manifest['uses-permission'].push({
                  $: {
                    'android:name': name,
                    ...(maxSdkVersion === undefined
                      ? {}
                      : { 'android:maxSdkVersion': String(maxSdkVersion) }),
                  },
                })
              }
              if (audio?.microphone !== undefined)
                ensurePermission('android.permission.RECORD_AUDIO')
              if (photoLibrary?.readWrite !== undefined) {
                ensurePermission('android.permission.READ_MEDIA_IMAGES')
                ensurePermission('android.permission.READ_MEDIA_VIDEO')
                ensurePermission('android.permission.READ_EXTERNAL_STORAGE', 32)
              }
              if (photoLibrary?.addOnly !== undefined)
                ensurePermission('android.permission.WRITE_EXTERNAL_STORAGE', 28)
              if (contacts !== undefined) {
                ensurePermission('android.permission.READ_CONTACTS')
                ensurePermission('android.permission.WRITE_CONTACTS')
              }
              if (calendar?.usage !== undefined) {
                ensurePermission('android.permission.READ_CALENDAR')
                ensurePermission('android.permission.WRITE_CALENDAR')
              }
              if (audio?.background === true) {
                ensurePermission('android.permission.FOREGROUND_SERVICE')
                ensurePermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK')
              }
              const application =
                AndroidConfig.Manifest.getMainApplicationOrThrow(nextConfig.modResults)
              const ensureMetaData = (name) => {
                application['meta-data'] = (application['meta-data'] ?? []).filter(
                  (entry) => entry.$['android:name'] !== name
                )
                application['meta-data'].push({
                  $: { 'android:name': name, 'android:value': 'true' },
                })
              }
              if (photoLibrary?.addOnly !== undefined)
                ensureMetaData('one.photoLibrary.addOnly')
              if (audio?.background === true) {
                ensureMetaData('one.audio.background')
                const serviceName = 'com.margelo.nitro.one.OneAudioService'
                application['service'] = (application['service'] ?? []).filter(
                  (entry) => entry.$['android:name'] !== serviceName
                )
                application['service'].push({
                  $: {
                    'android:name': serviceName,
                    'android:exported': 'false',
                    'android:foregroundServiceType': 'mediaPlayback',
                  },
                })
              }
              return nextConfig
            },
          ],
        ]
  const host = nativeProjectPatches.ONE_NOTIFICATIONS
  const notificationPlugins = !notifications
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            nextConfig.modResults[host.enabledInfoPlistKey] = true
            if (notifications.push) nextConfig.modResults[host.pushInfoPlistKey] = true
            return nextConfig
          },
        ],
        [
          withEntitlementsPlist,
          (nextConfig) => {
            if (notifications.push) {
              nextConfig.modResults['aps-environment'] =
                notifications.mode || host.apsEnvironment
            }
            return nextConfig
          },
        ],
        [
          withAndroidManifest,
          (nextConfig) => {
            const manifest = nextConfig.modResults.manifest
            manifest['uses-permission'] ??= []
            for (const name of host.androidPermissions) {
              if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
                manifest['uses-permission'].push({ $: { 'android:name': name } })
              }
            }
            const application =
              AndroidConfig.Manifest.getMainApplicationOrThrow(nextConfig.modResults)
            const component = (kind, name, action) => {
              application[kind] = (application[kind] ?? []).filter(
                (entry) => entry.$['android:name'] !== name
              )
              application[kind].push({
                $: { 'android:name': name, 'android:exported': 'false' },
                'intent-filter': [{ action: [{ $: { 'android:name': action } }] }],
              })
            }
            component('receiver', host.receiver, host.receiverAction)
            if (notifications.push) {
              component('service', host.pushService, host.pushServiceAction)
            }
            return nextConfig
          },
        ],
        [
          withGradleProperties,
          (nextConfig) => {
            if (!notifications.push) return nextConfig
            const properties = nextConfig.modResults.filter(
              (item) => !(item.type === 'property' && item.key === host.pushGradleProperty)
            )
            properties.push({ type: 'property', key: host.pushGradleProperty, value: 'true' })
            nextConfig.modResults = properties
            return nextConfig
          },
        ],
      ]

  // appends one import to the app's bridging header, which is how the app
  // target reaches One's c entry points: it cannot import the One module.
  const importIntoBridgingHeader = (option, importLine) => [
    withDangerousMod,
    [
      'ios',
      (nextConfig) => {
        const { platformProjectRoot, projectName } = nextConfig.modRequest
        const header = path.join(
          platformProjectRoot,
          projectName,
          `${projectName}-Bridging-Header.h`
        )
        if (!fs.existsSync(header)) {
          throw new Error(
            `[vxrn/expo-plugin] ${option}: expected the app's bridging header at ${header}`
          )
        }
        const contents = fs.readFileSync(header, 'utf8')
        if (!contents.includes(importLine)) {
          fs.writeFileSync(header, `${contents.trimEnd()}\n${importLine}\n`)
        }
        return nextConfig
      },
    ],
  ]

  // the built contract parser; the src twin ships too but node cannot run
  // typescript, so Expo prebuild reads the same dist build the bundler uses.
  const loadNativeSourceContract = async () => {
    try {
      const [contract, ids] = await Promise.all([
        import('vxrn/native-source-contract'),
        import('vxrn/swift-package-id'),
      ])
      return { ...contract, ...ids }
    } catch (error) {
      throw new Error(
        `[vxrn/expo-plugin] nativeSource: cannot load the vxrn native-source-contract build: ${error.message}`
      )
    }
  }

  // mirrors one prebuild's generateSwiftPackages, but copies (never symlinks:
  // eas uploads and expo merges must stay self-contained) into the Expo ios
  // project. the podspec and Register.m bodies match one prebuild so the same
  // sources compile to the same pod.
  const writeExpoSwiftPackages = ({ platformProjectRoot, contract }) => {
    const skip = new Set(['node_modules', 'ios', 'android', 'dist', 'types', 'build'])
    const packages = contract.swiftPackageDirectories(projectRoot)
    for (const [id, packageDir] of packages) {
      const manifest = contract.swiftPodManifest(
        path.join(packageDir, 'Package.swift'),
        fs.readFileSync(path.join(packageDir, 'Package.swift'), 'utf8')
      )
      const podDir = path.join(platformProjectRoot, 'OneSwiftPackages', id)
      fs.rmSync(podDir, { recursive: true, force: true })
      const sources = []
      const collect = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.startsWith('.') || skip.has(entry.name)) continue
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) collect(full)
          else if (entry.name.endsWith('.swift') && entry.name !== 'Package.swift')
            sources.push(full)
        }
      }
      collect(packageDir)
      const artifacts = contract.writeSwiftPackageArtifacts(packageDir)
      const contracts = artifacts.contracts
      const hasView = contracts.some((entry) => entry.defaultView)
      if (contracts.filter((entry) => entry.defaultView).length > 1) {
        throw new Error(
          `[vxrn/expo-plugin] nativeSource: swift package ${packageDir} has more than one @main type`
        )
      }
      for (const source of sources) {
        const target = path.join(podDir, 'Sources', path.relative(packageDir, source))
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(source, target)
      }
      if (artifacts.glue) {
        fs.writeFileSync(
          path.join(podDir, 'Sources', 'OneNativeSource.generated.swift'),
          artifacts.glue
        )
      }
      fs.writeFileSync(
        path.join(podDir, `${id}.podspec`),
        `Pod::Spec.new do |s|
  s.name = '${id}'
  s.version = '0.0.0'
  s.summary = 'swift package ${path.relative(projectRoot, packageDir) || '.'}'
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
      fs.writeFileSync(
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
    return packages.size
  }

  const insertAfterLine = (haystack, anchor, insertion) => {
    const anchorIndex = haystack.indexOf(anchor)
    if (anchorIndex === -1) return haystack
    const lineEnd = haystack.indexOf('\n', anchorIndex)
    if (lineEnd === -1) return `${haystack}\n${insertion}`
    return `${haystack.slice(0, lineEnd + 1)}${insertion}\n${haystack.slice(lineEnd + 1)}`
  }

  // mirrors one prebuild's kotlin import artifact rules: each import prefix
  // names the gradle artifact that supplies it, so an imported source
  // compiles without the app declaring the dependency.
  const kotlinImportArtifacts = [
    {
      importPrefix: 'androidx.compose.material.icons',
      artifact: 'androidx.compose.material:material-icons-core',
      versionKey: 'materialIconsVersion',
      version: '1.7.6',
    },
  ]

  const kotlinSourceImports = (dir) => {
    const imports = new Set()
    if (!fs.existsSync(dir)) return imports
    const visit = (entry) => {
      if (fs.statSync(entry).isDirectory()) {
        for (const child of fs.readdirSync(entry)) visit(path.join(entry, child))
        return
      }
      if (!entry.endsWith('.kt')) return
      for (const line of fs.readFileSync(entry, 'utf8').split('\n')) {
        const match = /^\s*import\s+([A-Za-z0-9_.]+)/.exec(line)
        if (match) imports.add(match[1])
      }
    }
    visit(dir)
    return imports
  }

  // mirrors one prebuild's enableAppComposeIntegration on the Expo android
  // project. one prebuild owns its template so its anchors always hit; the
  // Expo template may differ, so a missed anchor fails fast with the manual
  // lines instead of leaving views uncompilable.
  const enableExpoComposeIntegration = (androidRoot) => {
    const manual =
      'add the compose gradle plugin, buildFeatures { compose true }, and the androidx.compose dependencies from one prebuild'
    const rootBuildGradlePath = path.join(androidRoot, 'build.gradle')
    if (fs.existsSync(rootBuildGradlePath)) {
      let content = fs.readFileSync(rootBuildGradlePath, 'utf8')
      const composePluginClasspath =
        '        classpath("org.jetbrains.kotlin.plugin.compose:org.jetbrains.kotlin.plugin.compose.gradle.plugin:$kotlinVersion")'
      if (!content.includes('org.jetbrains.kotlin.plugin.compose')) {
        const anchor = content.includes('classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")')
          ? 'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")'
          : 'classpath "org.jetbrains.kotlin:kotlin-gradle-plugin"'
        if (!content.includes(anchor)) {
          throw new Error(`[vxrn/expo-plugin] nativeSource: no kotlin classpath anchor in android/build.gradle; ${manual}`)
        }
        content = insertAfterLine(content, anchor, composePluginClasspath)
        fs.writeFileSync(rootBuildGradlePath, content, 'utf8')
      }
    }
    const appBuildGradlePath = path.join(androidRoot, 'app/build.gradle')
    if (!fs.existsSync(appBuildGradlePath)) {
      throw new Error(`[vxrn/expo-plugin] nativeSource: expected app/build.gradle; ${manual}`)
    }
    let content = fs.readFileSync(appBuildGradlePath, 'utf8')
    if (!content.includes('org.jetbrains.kotlin.plugin.compose')) {
      const pluginAnchor = content.includes('apply plugin: "org.jetbrains.kotlin.android"')
        ? 'apply plugin: "org.jetbrains.kotlin.android"'
        : "apply plugin: 'org.jetbrains.kotlin.android'"
      if (!content.includes(pluginAnchor)) {
        throw new Error(`[vxrn/expo-plugin] nativeSource: no kotlin android plugin anchor in app/build.gradle; ${manual}`)
      }
      content = insertAfterLine(
        content,
        pluginAnchor,
        'apply plugin: "org.jetbrains.kotlin.plugin.compose"'
      )
    }
    if (!content.includes('compose true')) {
      if (!content.includes('android {')) {
        throw new Error(`[vxrn/expo-plugin] nativeSource: no android block anchor in app/build.gradle; ${manual}`)
      }
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
        '    def navigationComposeVersion = rootProject.ext.has("navigationComposeVersion") ? rootProject.ext.get("navigationComposeVersion") : "2.10.2"',
        '    implementation "androidx.navigation:navigation-compose:$navigationComposeVersion"',
      ].join('\n')
      const depsAnchor = content.includes('implementation("com.facebook.react:react-android")')
        ? 'implementation("com.facebook.react:react-android")'
        : 'implementation "com.facebook.react:react-android"'
      if (!content.includes(depsAnchor)) {
        throw new Error(`[vxrn/expo-plugin] nativeSource: no react-android dependency anchor in app/build.gradle; ${manual}`)
      }
      content = insertAfterLine(content, depsAnchor, composeDeps)
    }
    // each import rule carries its own guard, so a re-prebuild adds a newly
    // needed artifact without touching the rest of the file.
    const imports = kotlinSourceImports(path.join(androidRoot, 'app/src/main/java/one/source'))
    for (const rule of kotlinImportArtifacts) {
      const needed = [...imports].some(
        (name) => name === rule.importPrefix || name.startsWith(`${rule.importPrefix}.`)
      )
      if (!needed || content.includes(rule.artifact)) continue
      const reactAnchor = content.includes('implementation("com.facebook.react:react-android")')
        ? 'implementation("com.facebook.react:react-android")'
        : 'implementation "com.facebook.react:react-android"'
      const anchor = content.includes('androidx.compose.material3:material3')
        ? 'androidx.compose.material3:material3'
        : reactAnchor
      if (!content.includes(anchor)) {
        throw new Error(`[vxrn/expo-plugin] nativeSource: no dependency anchor for ${rule.artifact} in app/build.gradle; ${manual}`)
      }
      content = insertAfterLine(
        content,
        anchor,
        [
          `    def ${rule.versionKey} = rootProject.ext.has("${rule.versionKey}") ? rootProject.ext.get("${rule.versionKey}") : "${rule.version}"`,
          `    implementation "${rule.artifact}:$${rule.versionKey}"`,
        ].join('\n')
      )
    }
    fs.writeFileSync(appBuildGradlePath, content, 'utf8')
  }

  // mirrors one prebuild's generateKotlinSources collection rule (a Kotlin
  // file anywhere outside the skipped dirs and non-workspace nested
  // packages) into the Expo android project. the generator owns
  // app/src/main/java/one/source and rebuilds it, so a moved or deleted
  // source cannot leave a stale copy behind.
  const writeExpoKotlinSources = ({ platformProjectRoot, contract }) => {
    const skip = new Set(['node_modules', 'ios', 'android', 'dist', 'types', 'build', 'tests', '__tests__', 'scripts', 'evidence'])
    const sources = []
    const manifest = fs.existsSync(path.join(projectRoot, 'package.json'))
      ? JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
      : {}
    const workspacePatterns = Array.isArray(manifest.workspaces)
      ? manifest.workspaces
      : manifest.workspaces?.packages ?? []
    const fastGlob = require('fast-glob')
    const workspaceRoots = new Set(fastGlob.sync(workspacePatterns, {
      cwd: projectRoot, absolute: true, onlyDirectories: true,
      ignore: ['**/node_modules/**', '**/ios/**', '**/android/**'],
    }).map((directory) => path.resolve(directory)))
    const collect = (dir) => {
      if (dir !== projectRoot && fs.existsSync(path.join(dir, 'package.json')) && !workspaceRoots.has(path.resolve(dir))) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || skip.has(entry.name)) continue
        const source = path.join(dir, entry.name)
        if (entry.isDirectory()) collect(source)
        else if (entry.isFile() && entry.name.endsWith('.kt')) sources.push(source)
      }
    }
    collect(projectRoot)
    const output = path.join(platformProjectRoot, 'app/src/main/java/one/source')
    fs.rmSync(output, { recursive: true, force: true })
    if (sources.length === 0) return { sources: 0, hasViews: false }
    let hasViews = false
    for (const source of sources) {
      const id = contract.kotlinSourceId(projectRoot, source)
      const target = path.join(output, id)
      fs.mkdirSync(target, { recursive: true })
      fs.copyFileSync(source, path.join(target, path.basename(source)))
      const parsed = contract.writeNativeSourceDeclaration(source)
      if (parsed.views.length > 0) hasViews = true
      if (parsed.modules.length > 0 || parsed.views.length > 0) {
        fs.writeFileSync(
          path.join(target, `OneNativeSource_${id}.kt`),
          contract.renderKotlinSourceGlue(id, parsed).source
        )
      }
    }
    if (hasViews) enableExpoComposeIntegration(platformProjectRoot)
    return { sources: sources.length, hasViews }
  }

  const nativeSourcePlugins = !nativeSource
    ? []
    : [
        [
          withDangerousMod,
          [
            'ios',
            async (nextConfig) => {
              const { platformProjectRoot } = nextConfig.modRequest
              const contract = await loadNativeSourceContract()
              const count = writeExpoSwiftPackages({ platformProjectRoot, contract })
              if (count > 0) {
                const podfilePath = path.join(platformProjectRoot, 'Podfile')
                if (fs.existsSync(podfilePath)) {
                  let podfile = fs.readFileSync(podfilePath, 'utf8')
                  podfile = nativeProjectPatches.injectOneSwiftPackagesIntoPodfile(podfile)
                  fs.writeFileSync(podfilePath, podfile, 'utf8')
                }
              }
              return nextConfig
            },
          ],
        ],
        [
          withDangerousMod,
          [
            'android',
            async (nextConfig) => {
              const { platformProjectRoot } = nextConfig.modRequest
              const contract = await loadNativeSourceContract()
              writeExpoKotlinSources({ platformProjectRoot, contract })
              return nextConfig
            },
          ],
        ],
      ]

  const updates = options.updates
  if (updates && (typeof updates.runtimeVersion !== 'string' || !updates.runtimeVersion)) {
    throw new Error('[vxrn/expo-plugin] updates.runtimeVersion must be a non-empty string')
  }
  const updatesHost = nativeProjectPatches.ONE_UPDATES
  const updatesPlugins = !updates
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            // without the url the embedded bundle launches with updates
            // disabled, as in one prebuild.
            if (updates.url !== undefined) {
              nextConfig.modResults[updatesHost.urlInfoPlistKey] = updates.url
            }
            nextConfig.modResults[updatesHost.runtimeVersionInfoPlistKey] =
              updates.runtimeVersion
            return nextConfig
          },
        ],
        [
          withAppDelegate,
          (nextConfig) => {
            nextConfig.modResults.contents =
              nativeProjectPatches.pointReleaseBundleURLAtOneUpdates(
                nextConfig.modResults.contents
              )
            return nextConfig
          },
        ],
        importIntoBridgingHeader('updates', updatesHost.bridgingHeaderImport),
        [
          withMainActivity,
          () => {
            throw new Error(
              '[vxrn/expo-plugin] updates: One.Updates on Android needs one prebuild; Expo prebuild supports it on iOS only'
            )
          },
        ],
      ]

  const launchScreenPlugins = !options.holdLaunchScreen
    ? []
    : [
        [
          withAppDelegate,
          (nextConfig) => {
            nextConfig.modResults.contents =
              nativeProjectPatches.holdLaunchScreenOverRootView(
                nextConfig.modResults.contents
              )
            return nextConfig
          },
        ],
        importIntoBridgingHeader(
          'holdLaunchScreen',
          nativeProjectPatches.ONE_LAUNCH_SCREEN.bridgingHeaderImport
        ),
      ]

  return withPlugins(config, [
    ...locationPlugins,
    ...audioPlugins,
    ...photoLibraryPlugins,
    ...contactsPlugins,
    ...calendarPlugins,
    ...mediaPlugins,
    ...notificationPlugins,
    ...updatesPlugins,
    ...launchScreenPlugins,
    ...nativeSourcePlugins,
    [
      withXcodeProject,
      (nextConfig) => {
        const phase = nextConfig.modResults.buildPhaseObject(
          'PBXShellScriptBuildPhase',
          'Bundle React Native code and images'
        )
        if (!phase) return nextConfig

        let script = JSON.parse(phase.shellScript)
        script =
          nativeProjectPatches.removeExpoDefaultsFromBundleReactNativeShellScript(script)
        script = nativeProjectPatches.addSetCliPathToBundleReactNativeShellScript(script)
        script = nativeProjectPatches.addPodHermescToBundleReactNativeShellScript(script)
        script = nativeProjectPatches.addDepsPatchToBundleReactNativeShellScript(script)
        if (updates) {
          script = nativeProjectPatches.addEmbeddedUpdatesManifestToBundleReactNativeShellScript(
            script,
            updates.runtimeVersion
          )
        }
        phase.shellScript = JSON.stringify(script)
        return nextConfig
      },
    ],
    [
      withAppBuildGradle,
      (nextConfig) => {
        let contents = nativeProjectPatches.replaceAppBuildGradleReactBlock(
          nextConfig.modResults.contents
        )
        contents = nativeProjectPatches.addDepsPatchToAppBuildGradle(contents)
        nextConfig.modResults.contents = contents
        return nextConfig
      },
    ],
    [
      withMainApplication,
      (nextConfig) => {
        const anchor = 'context = applicationContext,'
        const contents = nextConfig.modResults.contents
        if (!contents.includes('ExpoReactHostFactory.getDefaultReactHost(') || !contents.includes(anchor)) {
          throw new Error('[vxrn/expo-plugin] expected ExpoReactHostFactory in MainApplication')
        }
        const configured = `${anchor}\n      jsMainModulePath = "index",\n      useDevSupport = BuildConfig.DEBUG,`
        // the prebuilt react library has DEBUG=false. use the application build
        // flag and One's entry instead of Expo's virtual Metro entry.
        nextConfig.modResults.contents = contents.includes(configured)
          ? contents
          : contents.replace(anchor, configured)
        return nextConfig
      },
    ],
    [
      withMainActivity,
      (nextConfig) => {
        const contents = nativeProjectPatches.addReactNativeScreensFix(
          nextConfig.modResults.contents
        )
        nextConfig.modResults.contents = options.holdLaunchScreen
          ? nativeProjectPatches.holdLaunchScreenInMainActivity(contents)
          : contents
        return nextConfig
      },
    ],
    [
      withDangerousMod,
      [
        'ios',
        (nextConfig) => {
          const podfilePath = path.join(
            nextConfig.modRequest.platformProjectRoot,
            'Podfile'
          )
          if (!fs.existsSync(podfilePath)) return nextConfig

          let podfile = fs.readFileSync(podfilePath, 'utf8')
          podfile = nativeProjectPatches.injectFmtCxx17FixIntoPodfile(podfile)
          podfile = nativeProjectPatches.injectWebGPUHeaderPathsIntoPodfile(podfile)
          podfile = nativeProjectPatches.injectHermesMinificationPatchIntoPodfile(podfile)
          podfile = nativeProjectPatches.injectReactNativeScreensGammaIntoPodfile(podfile)
          if (nativeProjectPatches.hasNitroWebImage(projectRoot)) {
            podfile = nativeProjectPatches.injectNitroWebImageModularHeaderIntoPodfile(podfile)
          }
          fs.writeFileSync(podfilePath, podfile, 'utf8')
          return nextConfig
        },
      ],
    ],
  ])
}
