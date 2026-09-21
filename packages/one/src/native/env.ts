// one-owned public environment and platform contract. One defaults to
// ONE_PUBLIC_* and ONE_PLATFORM while preserving Expo-compatible aliases.

export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'
export const EXPO_PUBLIC_PREFIX = 'EXPO_PUBLIC_'
export const ONE_PLATFORM_ENV = 'ONE_PLATFORM'
export const EXPO_PLATFORM_ENV = 'EXPO_OS'

export type OnePlatformKey = 'ios' | 'android' | 'web'

export function pickOnePublicEnv(
  env: Record<string, string | undefined>
): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (
      (key.startsWith(ONE_PUBLIC_PREFIX) || key.startsWith(EXPO_PUBLIC_PREFIX)) &&
      value !== undefined
    ) {
      picked[key] = value
    }
  }

  for (const [key, value] of Object.entries(picked)) {
    const counterpart = key.startsWith(ONE_PUBLIC_PREFIX)
      ? `${EXPO_PUBLIC_PREFIX}${key.slice(ONE_PUBLIC_PREFIX.length)}`
      : `${ONE_PUBLIC_PREFIX}${key.slice(EXPO_PUBLIC_PREFIX.length)}`
    if (!Object.prototype.hasOwnProperty.call(picked, counterpart)) {
      picked[counterpart] = value
    }
  }

  return picked
}
