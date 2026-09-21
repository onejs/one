import { execFileSync } from 'node:child_process'
import module from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateNativeApp, type NativeAppManifest } from '@vxrn/utils/nativeAppManifest'
import FSExtra from 'fs-extra'
import sharp from 'sharp'

type NativeProjectPatches = {
  addSetCliPathToBundleReactNativeShellScript(input: string): string
  addPodHermescToBundleReactNativeShellScript(input: string): string
  addDepsPatchToBundleReactNativeShellScript(input: string): string
  injectFmtCxx17FixIntoPodfile(input: string): string
  injectHermesMinificationPatchIntoPodfile(input: string): string
  injectReactNativeScreensGammaIntoPodfile(input: string): string
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
  FSExtra.writeFileSync(
    path.join(stylesV31, 'styles.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme">
        <item name="android:windowSplashScreenBackground">@color/splash_background</item>
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/splash</item>
    </style>
</resources>
`
  )
}

// pure render of one template file: path renames plus content replacements.
// `content: null` means binary copy.
export function renderPrebuildFile(args: {
  relativePath: string
  content: string | null
  platform: 'ios' | 'android'
  app: NativeAppManifest
}): RenderedPrebuildFile {
  const { relativePath, content, platform, app } = args
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
    if (platform === 'ios' && relativePath.endsWith('/Info.plist') && schemes.length) {
      rendered = rendered.replace(
        '\t<key>LSRequiresIPhoneOS</key>',
        `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleTypeRole</key>
\t\t\t<string>Editor</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
${schemes.map((scheme) => `\t\t\t\t<string>${scheme}</string>`).join('\n')}
\t\t\t</array>
\t\t</dict>
\t</array>
\t<key>LSRequiresIPhoneOS</key>`
      )
    }
    if (
      platform === 'android' &&
      relativePath === 'app/src/main/AndroidManifest.xml' &&
      app.imagePicker?.camera !== undefined
    ) {
      rendered = rendered.replace(
        '<uses-permission android:name="android.permission.INTERNET" />',
        '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />'
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
    if (platform === 'ios' && relativePath.endsWith('/Info.plist')) {
      if (app.ios?.usesNonExemptEncryption !== undefined) {
        rendered = rendered.replace(
          '\t<key>LSRequiresIPhoneOS</key>',
          `\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<${app.ios.usesNonExemptEncryption ? 'true' : 'false'}/>\n\t<key>LSRequiresIPhoneOS</key>`
        )
      }
      if (app.imagePicker?.camera !== undefined) {
        rendered = rendered.replace(
          '\t<key>LSRequiresIPhoneOS</key>',
          `\t<key>NSCameraUsageDescription</key>\n\t<string>${escapeXml(app.imagePicker.camera)}</string>\n\t<key>LSRequiresIPhoneOS</key>`
        )
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
      rendered = patchIosBundlePhase(rendered)
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
