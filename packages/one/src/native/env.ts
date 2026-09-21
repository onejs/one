import { withExpoPublicEnvAliases } from '@vxrn/utils'

// one-owned public environment and platform names. bundlers also expose exact
// expo aliases where upstream expo packages require them.

export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'
export const ONE_PLATFORM_ENV = 'ONE_PLATFORM'

export type OnePlatformKey = 'ios' | 'android' | 'web'

export function pickOnePublicEnv(
  env: Record<string, string | undefined>
): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (
      (key.startsWith(ONE_PUBLIC_PREFIX) || key.startsWith('EXPO_PUBLIC_')) &&
      value !== undefined
    ) {
      picked[key] = value
    }
  }
  return withExpoPublicEnvAliases(picked)
}
