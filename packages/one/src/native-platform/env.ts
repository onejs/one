// one-owned public environment and platform contract shared by native
// rolldown dev, native rolldown production, metro, and web.
// ONE_PUBLIC_* is the only app-public prefix; ONE_PLATFORM (ios, android,
// web) is the only app-visible platform key. expo-prefixed keys are a
// migration error, never copied, ignored, or aliased.

export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'

export const ONE_PLATFORM = 'ONE_PLATFORM' as const

export const ONE_PLATFORM_VALUES = ['ios', 'android', 'web'] as const

export type OnePlatformEnvValue = (typeof ONE_PLATFORM_VALUES)[number]

export function isOnePlatformValue(value: unknown): value is OnePlatformEnvValue {
  return (
    value === 'ios' || value === 'android' || value === 'web'
  )
}

export const FORBIDDEN_EXPO_PUBLIC_PREFIX = 'EXPO_PUBLIC_'

export const FORBIDDEN_EXPO_PLATFORM_KEY = 'EXPO_OS'

// supplying an expo-prefixed public variable fails the build with a
// migration error; it is not copied, ignored, or aliased.
export function assertNoExpoPublicEnv(
  env: Record<string, string | undefined>
): void {
  const offenders = Object.keys(env).filter((key) =>
    key.startsWith(FORBIDDEN_EXPO_PUBLIC_PREFIX)
  )
  if (offenders.length > 0) {
    throw new Error(
      `[one env] ${FORBIDDEN_EXPO_PUBLIC_PREFIX}* is not a one environment prefix. ` +
        `rename ${offenders.join(', ')} to ${ONE_PUBLIC_PREFIX}* (migration: s/EXPO_PUBLIC_/ONE_PUBLIC_/).`
    )
  }
  if (env[FORBIDDEN_EXPO_PLATFORM_KEY] !== undefined) {
    throw new Error(
      `[one env] ${FORBIDDEN_EXPO_PLATFORM_KEY} is not a one platform key. use ${ONE_PLATFORM} (ios, android, or web).`
    )
  }
}

// the single semantic owner for public env defines. bundler adapters (vite,
// rolldown dev/prod, metro) invoke this differently but carry no separate
// transform policy. expo keys can never enter emitted bundles or the whole
// import.meta.env object: they fail above before defines are built.
export function buildOneEnvDefines(options: {
  platform: OnePlatformEnvValue
  publicEnv: Record<string, string | undefined>
  dev: boolean
}): Record<string, string> {
  assertNoExpoPublicEnv(options.publicEnv)
  if (!isOnePlatformValue(options.platform)) {
    throw new Error(`[one env] platform must be one of ${ONE_PLATFORM_VALUES.join(', ')}`)
  }
  const mode = options.dev ? 'development' : 'production'
  const publicEntries = Object.entries(options.publicEnv).filter(
    ([key, value]) => key.startsWith(ONE_PUBLIC_PREFIX) && value !== undefined
  )
  const define: Record<string, string> = {}
  for (const [key, value] of publicEntries) {
    define[`import.meta.env.${key}`] = JSON.stringify(value)
    define[`process.env.${key}`] = JSON.stringify(value)
  }
  define['process.env.NODE_ENV'] = JSON.stringify(mode)
  define[`process.env.${ONE_PLATFORM}`] = JSON.stringify(options.platform)
  define[`import.meta.env.${ONE_PLATFORM}`] = JSON.stringify(options.platform)
  define['import.meta.env.MODE'] = JSON.stringify(mode)
  define['import.meta.env.DEV'] = options.dev ? 'true' : 'false'
  define['import.meta.env.PROD'] = options.dev ? 'false' : 'true'
  const envObject: Record<string, unknown> = {
    ...Object.fromEntries(publicEntries),
    MODE: mode,
    DEV: options.dev,
    PROD: !options.dev,
    SSR: false,
    [ONE_PLATFORM]: options.platform,
  }
  define['import.meta.env'] = JSON.stringify(envObject)
  return define
}
