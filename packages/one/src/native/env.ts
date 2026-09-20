// one-owned public environment and platform contract.
// ONE_PUBLIC_* is the only app-public prefix replacing EXPO_PUBLIC_*.
// ONE_PLATFORM (ios | android | web) replaces EXPO_OS.

export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'
export const ONE_PLATFORM_ENV = 'ONE_PLATFORM'

export type OnePlatformKey = 'ios' | 'android' | 'web'

export function assertNoExpoPublicEnv(
  env: Record<string, string | undefined>
): void {
  const offenders = Object.keys(env).filter((key) => key.startsWith('EXPO_PUBLIC_'))
  if (offenders.length > 0) {
    throw new Error(
      `[one] ${offenders[0]} uses the removed expo prefix. rename it to ONE_PUBLIC_*`
    )
  }
}

export function pickOnePublicEnv(
  env: Record<string, string | undefined>
): Record<string, string> {
  assertNoExpoPublicEnv(env)
  const picked: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(ONE_PUBLIC_PREFIX) && value !== undefined) {
      picked[key] = value
    }
  }
  return picked
}
