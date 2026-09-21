// typed native.app manifest inside the existing one vite options.
// name is the native target and appregistry key.

export interface NativeAppManifest {
  name: string
  displayName?: string
  scheme?: string | string[]
  version?: string
  icon?: {
    source: string
    backgroundColor: string
  }
  splash?: {
    source: string
    backgroundColor: string
    width?: number
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
  }
  android?: {
    applicationId: string
    versionCode?: number
    minSdk?: number
    adaptiveIcon?: {
      foreground?: string
      background?: string
    }
  }
}

const TARGET_NAME = /^[A-Za-z][A-Za-z0-9_]*$/
const SCHEME = /^[a-z][a-z0-9+.-]*$/i
const VERSION = /^\d+\.\d+\.\d+/
const BUILD_NUMBER = /^[A-Za-z0-9.]+$/
const REVERSE_DNS = /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/
const DEPLOYMENT_TARGET = /^\d+\.\d+$/
const HEX_COLOR = /^#[\da-f]{6}$/i

function fail(message: string): never {
  throw new Error(`[one] invalid native.app: ${message}`)
}

export function validateNativeApp(manifest: NativeAppManifest): NativeAppManifest {
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
  if (manifest.ios !== undefined) {
    if (!manifest.ios.bundleId || !REVERSE_DNS.test(manifest.ios.bundleId)) {
      fail(`ios.bundleId "${manifest.ios.bundleId}" must be reverse-dns`)
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
  }
  if (manifest.android !== undefined) {
    if (
      !manifest.android.applicationId ||
      !REVERSE_DNS.test(manifest.android.applicationId)
    ) {
      fail(
        `android.applicationId "${manifest.android.applicationId}" must be reverse-dns`
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
  }
  return manifest
}
