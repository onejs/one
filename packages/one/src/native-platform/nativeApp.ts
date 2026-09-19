// typed native.app manifest inside the existing one vite options.
// name is the native target and the AppRegistry key.

export type OneNativeAppIosConfig = {
  bundleId: string
  supportsTablet?: boolean
  deploymentTarget?: string
}

export type OneNativeAppAndroidConfig = {
  applicationId: string
  minSdk?: number
  adaptiveIcon?: {
    foreground?: string
    background?: string
  }
}

export type OneNativeAppConfig = {
  // native target name and AppRegistry key: alphanumeric, starts with a letter
  name: string
  displayName?: string
  scheme: string | string[]
  version: string
  icon?: string
  splash?: string
  ios: OneNativeAppIosConfig
  android: OneNativeAppAndroidConfig
}

// react native target names allow letters and digits once they start with a
// letter; anything else breaks the generated xcode/gradle projects.
const TARGET_NAME_RE = /^[A-Za-z][A-Za-z0-9]*$/

function fail(message: string): never {
  throw new Error(`[one native.app] ${message}`)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function validateNativeApp(input: unknown): OneNativeAppConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('native.app must be an object')
  }
  const app = input as Record<string, unknown>

  if (!nonEmptyString(app['name']) || !TARGET_NAME_RE.test(app['name'])) {
    fail(
      'native.app.name must start with a letter and contain only letters and digits: it is the native target and the AppRegistry key'
    )
  }

  const schemes = Array.isArray(app['scheme']) ? app['scheme'] : [app['scheme']]
  if (
    schemes.length === 0 ||
    !schemes.every((scheme) => nonEmptyString(scheme) && /^[a-z][a-z0-9+.-]*$/i.test(scheme))
  ) {
    fail('native.app.scheme must be a non-empty scheme string or array of scheme strings')
  }

  if (!nonEmptyString(app['version'])) {
    fail('native.app.version must be a non-empty version string')
  }

  const ios = app['ios'] as Record<string, unknown> | undefined
  if (!ios || !nonEmptyString(ios['bundleId'])) {
    fail('native.app.ios.bundleId is required before writing either platform project')
  }

  const android = app['android'] as Record<string, unknown> | undefined
  if (!android || !nonEmptyString(android['applicationId'])) {
    fail('native.app.android.applicationId is required before writing either platform project')
  }

  if (
    android['minSdk'] !== undefined &&
    (typeof android['minSdk'] !== 'number' || android['minSdk'] < 0)
  ) {
    fail('native.app.android.minSdk must be a non-negative number')
  }

  return {
    name: app['name'] as string,
    ...(nonEmptyString(app['displayName']) ? { displayName: app['displayName'] } : {}),
    scheme: app['scheme'] as string | string[],
    version: app['version'] as string,
    ...(nonEmptyString(app['icon']) ? { icon: app['icon'] as string } : {}),
    ...(nonEmptyString(app['splash']) ? { splash: app['splash'] as string } : {}),
    ios: {
      bundleId: ios['bundleId'] as string,
      ...(typeof ios['supportsTablet'] === 'boolean'
        ? { supportsTablet: ios['supportsTablet'] }
        : {}),
      ...(nonEmptyString(ios['deploymentTarget'])
        ? { deploymentTarget: ios['deploymentTarget'] as string }
        : {}),
    },
    android: {
      applicationId: android['applicationId'] as string,
      ...(typeof android['minSdk'] === 'number' ? { minSdk: android['minSdk'] } : {}),
      ...(android['adaptiveIcon'] && typeof android['adaptiveIcon'] === 'object'
        ? { adaptiveIcon: android['adaptiveIcon'] as OneNativeAppAndroidConfig['adaptiveIcon'] }
        : {}),
    },
  }
}
