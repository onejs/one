// build only the One pod and its dependencies, then package relocatable native
// libraries. the same installer computes the producer and consumer identities.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  constants,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { artifactKey, identity } from '../packages/one/ios/prebuilt.ts'

const { values } = parseArgs({
  options: {
    ios: { type: 'string' },
    output: { type: 'string' },
    configuration: { type: 'string' },
    'derived-data': { type: 'string' },
    'skip-build': { type: 'boolean', default: false },
    'skip-build-sdk': { type: 'string', multiple: true, default: [] },
  },
})
assert(values.ios && values.output, '--ios and --output are required')
assert(
  values.configuration === 'Debug' || values.configuration === 'Release',
  '--configuration must be Debug or Release'
)
const configuration = values.configuration
const ios = realpathSync(values.ios)
mkdirSync(resolve(values.output), { recursive: true })
const output = realpathSync(values.output)
const derivedPath = resolve(values['derived-data'] ?? join(output, 'DerivedData'))
mkdirSync(derivedPath, { recursive: true })
const derived = realpathSync(derivedPath)
const one = resolve(import.meta.dirname, '../packages/one')
const expected = identity(ios)
const key = artifactKey(expected)
mkdirSync(output, { recursive: true })
const work = join(output, configuration)
rmSync(work, { recursive: true, force: true })
mkdirSync(work)

for (const sdk of ['iphoneos', 'iphonesimulator']) {
  if (!values['skip-build'] && !values['skip-build-sdk'].includes(sdk)) {
    execFileSync(
      'xcodebuild',
      [
        '-project',
        join(ios, 'Pods/Pods.xcodeproj'),
        '-scheme',
        'One',
        '-configuration',
        configuration,
        '-sdk',
        sdk,
        '-destination',
        sdk === 'iphoneos' ? 'generic/platform=iOS' : 'generic/platform=iOS Simulator',
        '-derivedDataPath',
        derived,
        '-packageAuthorizationProvider',
        'netrc',
        '-jobs',
        '2',
        'ARCHS=arm64',
        'ONLY_ACTIVE_ARCH=YES',
        'CODE_SIGNING_ALLOWED=NO',
        `CLANG_MODULE_CACHE_PATH=${join(derived, 'ModuleCache.noindex')}`,
        'build',
      ],
      { cwd: ios, stdio: 'inherit', env: { ...process.env, ONE_PREBUILT_IOS: '0' } }
    )
  }
  const settings: Array<{ target: string; buildSettings: Record<string, string> }> =
    JSON.parse(
      execFileSync(
        'xcodebuild',
        [
          '-project',
          join(ios, 'Pods/Pods.xcodeproj'),
          '-scheme',
          'One',
          '-configuration',
          configuration,
          '-sdk',
          sdk,
          '-derivedDataPath',
          derived,
          '-showBuildSettings',
          '-json',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      )
    )
  const target = settings.find((entry) => entry.target === 'One')
  assert(target, 'Xcode did not report the One build settings')
  const products = target.buildSettings.TARGET_BUILD_DIR!
  const framework = join(work, sdk, 'One.framework')
  const headers = join(framework, 'Headers')
  mkdirSync(headers, { recursive: true })
  const productFramework = join(products, 'One.framework')
  const library = existsSync(productFramework)
    ? join(productFramework, 'One')
    : join(products, 'libOne.a')
  assert(existsSync(library), `missing One build product: ${library}`)
  copyFileSync(library, join(framework, 'One'), constants.COPYFILE_FICLONE)
  const modules = existsSync(productFramework)
    ? join(productFramework, 'Modules/One.swiftmodule')
    : join(products, 'One.swiftmodule')
  cpSync(modules, join(framework, 'Modules/One.swiftmodule'), {
    recursive: true,
    dereference: true,
  })
  // Fabric's app dependency provider imports component headers which CocoaPods
  // treats as private in source builds. ship these along with Nitro's headers.
  const copyHeaders = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name)
      if (entry.isDirectory() && !['Tests', 'Prebuilt'].includes(entry.name))
        copyHeaders(file)
      else if (/\.(h|hpp)$/.test(entry.name)) {
        const target = join(headers, entry.name)
        assert(
          !existsSync(target) || readFileSync(target).equals(readFileSync(file)),
          `conflicting One header: ${entry.name}`
        )
        copyFileSync(file, target)
      }
    }
  }
  for (const directory of ['ios', 'cpp', 'nitrogen/generated'])
    copyHeaders(join(one, directory))
  const swiftHeader = join(
    target.buildSettings.OBJECT_FILE_DIR_normal!,
    'arm64/One-Swift.h'
  )
  copyFileSync(swiftHeader, join(headers, 'One-Swift.h'))
  copyFileSync(
    join(ios, 'Pods/Target Support Files/One/One-umbrella.h'),
    join(headers, 'One-umbrella.h')
  )
  writeFileSync(
    join(framework, 'Modules/module.modulemap'),
    'framework module One {\n  umbrella header "One-umbrella.h"\n  export *\n  module * { export * }\n}\nmodule One.Swift {\n  header "One-Swift.h"\n  requires objc\n}\n'
  )
  writeFileSync(
    join(framework, 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>dev.one.native</string><key>CFBundleName</key><string>One</string><key>CFBundleExecutable</key><string>One</string><key>CFBundlePackageType</key><string>FMWK</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>MinimumOSVersion</key><string>17.0</string><key>CFBundleSupportedPlatforms</key><array><string>${sdk === 'iphoneos' ? 'iPhoneOS' : 'iPhoneSimulator'}</string></array></dict></plist>\n`
  )
}
const xcframework = join(work, 'One.xcframework')
execFileSync(
  'xcodebuild',
  [
    '-create-xcframework',
    // serialized Swift modules require the exact compiler in the native identity.
    '-allow-internal-distribution',
    '-framework',
    join(work, 'iphoneos/One.framework'),
    '-framework',
    join(work, 'iphonesimulator/One.framework'),
    '-output',
    xcframework,
  ],
  { stdio: 'inherit' }
)
const file = `one-ios-${key}-${configuration}.tar.gz`
execFileSync('tar', ['-czf', join(output, file), '-C', work, 'One.xcframework'], {
  stdio: 'inherit',
  env: { ...process.env, COPYFILE_DISABLE: '1' },
})
const sha256 = execFileSync('shasum', ['-a', '256', join(output, file)], {
  encoding: 'utf8',
}).split(' ')[0]!
writeFileSync(
  join(output, `${configuration}.json`),
  `${JSON.stringify({ identity: expected, key, configuration, file, sha256 }, null, 2)}\n`
)
console.log(`One iOS ${configuration}: ${join(output, file)}`)
