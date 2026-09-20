import { execFileSync } from 'node:child_process'
import module from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import FSExtra from 'fs-extra'

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

// structural mirror of one({ native: { app } }). the one cli validates the
// full manifest before passing it here; vxrn re-validates the fields it
// writes so direct callers fail before touching either project.
export interface PrebuildAppConfig {
  name: string
  displayName?: string
  scheme?: string | string[]
  ios?: {
    bundleId: string
    deploymentTarget?: string
    screensGamma?: boolean
  }
  android?: {
    applicationId: string
    minSdk?: number
  }
}

const TARGET_NAME = /^[A-Za-z][A-Za-z0-9_]*$/
const SCHEME = /^[a-z][a-z0-9+.-]*$/i
const REVERSE_DNS = /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/
const DEPLOYMENT_TARGET = /^\d+\.\d+$/

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

function fail(message: string): never {
  throw new Error(`[vxrn] invalid native.app: ${message}`)
}

export function validatePrebuildApp(
  app: PrebuildAppConfig,
  platform?: 'ios' | 'android' | string
): void {
  if (!app || typeof app !== 'object') fail('manifest must be an object')
  if (!app.name || !TARGET_NAME.test(app.name)) {
    fail(
      `name "${app?.name}" must start with a letter and contain only letters, digits, and underscore`
    )
  }
  const schemes =
    app.scheme === undefined ? [] : Array.isArray(app.scheme) ? app.scheme : [app.scheme]
  for (const scheme of schemes) {
    if (typeof scheme !== 'string' || !SCHEME.test(scheme)) {
      fail(`scheme "${scheme}" must be a valid uri scheme`)
    }
  }
  if (!platform || platform === 'ios') {
    if (!app.ios?.bundleId || !REVERSE_DNS.test(app.ios.bundleId)) {
      fail(`ios.bundleId "${app.ios?.bundleId}" must be reverse-dns`)
    }
    if (
      app.ios.deploymentTarget !== undefined &&
      !DEPLOYMENT_TARGET.test(app.ios.deploymentTarget)
    ) {
      fail(`ios.deploymentTarget "${app.ios.deploymentTarget}" must look like "17.0"`)
    }
  }
  if (!platform || platform === 'android') {
    if (!app.android?.applicationId || !REVERSE_DNS.test(app.android.applicationId)) {
      fail(`android.applicationId "${app.android?.applicationId}" must be reverse-dns`)
    }
    if (
      app.android.minSdk !== undefined &&
      (!Number.isInteger(app.android.minSdk) ||
        app.android.minSdk < 21 ||
        app.android.minSdk > 36)
    ) {
      fail(`android.minSdk "${app.android.minSdk}" must be an integer from 21 to 36`)
    }
  }
}

export interface RenderedPrebuildFile {
  destRelativePath: string
  content: string | null
}

// pure render of one template file: path renames plus content replacements.
// `content: null` means binary copy.
export function renderPrebuildFile(args: {
  relativePath: string
  content: string | null
  platform: 'ios' | 'android'
  app: PrebuildAppConfig
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
    if (platform === 'android' && relativePath.endsWith('/MainActivity.kt')) {
      rendered = nativeProjectPatches.addReactNativeScreensFix(rendered)
      if (!rendered.includes('RNScreensFragmentFactory')) {
        throw new Error('[vxrn] failed to apply the react-native-screens activity patch')
      }
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
  app: PrebuildAppConfig,
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
}

export interface NativeDependencyInventory {
  name: string
  version: string
  platforms: string[]
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
