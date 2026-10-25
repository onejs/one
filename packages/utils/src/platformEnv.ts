export type NativePlatform = 'ios' | 'android' | 'macos' | 'linux'
export type Platform = NativePlatform | 'web'
export type ViteEnvironment = 'client' | 'ssr' | NativePlatform

export type PlatformEnv = {
  VITE_ENVIRONMENT: ViteEnvironment
  VITE_NATIVE: '' | '1'
  ONE_PLATFORM: Platform
  EXPO_OS?: NativePlatform
  TAMAGUI_TARGET: 'web' | 'native'
  TAMAGUI_ENVIRONMENT: ViteEnvironment
}

const platformEnvMap: Record<ViteEnvironment, PlatformEnv> = {
  client: {
    VITE_ENVIRONMENT: 'client',
    VITE_NATIVE: '',
    ONE_PLATFORM: 'web',
    TAMAGUI_TARGET: 'web',
    TAMAGUI_ENVIRONMENT: 'client',
  },
  ssr: {
    VITE_ENVIRONMENT: 'ssr',
    VITE_NATIVE: '',
    ONE_PLATFORM: 'web',
    TAMAGUI_TARGET: 'web',
    TAMAGUI_ENVIRONMENT: 'ssr',
  },
  ios: {
    VITE_ENVIRONMENT: 'ios',
    VITE_NATIVE: '1',
    ONE_PLATFORM: 'ios',
    EXPO_OS: 'ios',
    TAMAGUI_TARGET: 'native',
    TAMAGUI_ENVIRONMENT: 'ios',
  },
  android: {
    VITE_ENVIRONMENT: 'android',
    VITE_NATIVE: '1',
    ONE_PLATFORM: 'android',
    EXPO_OS: 'android',
    TAMAGUI_TARGET: 'native',
    TAMAGUI_ENVIRONMENT: 'android',
  },
  macos: {
    VITE_ENVIRONMENT: 'macos',
    VITE_NATIVE: '1',
    ONE_PLATFORM: 'macos',
    EXPO_OS: 'macos',
    TAMAGUI_TARGET: 'native',
    TAMAGUI_ENVIRONMENT: 'macos',
  },
  linux: {
    VITE_ENVIRONMENT: 'linux',
    VITE_NATIVE: '1',
    ONE_PLATFORM: 'linux',
    EXPO_OS: 'linux',
    TAMAGUI_TARGET: 'native',
    TAMAGUI_ENVIRONMENT: 'linux',
  },
}

const nativePlatforms = new Set<string>(['ios', 'android', 'macos', 'linux'])

export function isNativePlatform(platform: string | null | undefined): platform is NativePlatform {
  return platform != null && nativePlatforms.has(platform)
}

export function getPlatformEnv(environment: ViteEnvironment): PlatformEnv {
  return platformEnvMap[environment]
}

export function metroPlatformToViteEnvironment(
  platform: Platform | string | null | undefined
): ViteEnvironment {
  if (isNativePlatform(platform)) return platform
  return 'client'
}

/**
 * Format platform env for Vite's define config.
 * Returns both process.env.* and import.meta.env.* definitions.
 * VITE_NATIVE is "1" or "" (truthy/falsy string) to avoid polluting process.env types.
 */
export function getPlatformEnvDefine(
  environment: ViteEnvironment
): Record<string, string> {
  const env = getPlatformEnv(environment)
  const define: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    define[`process.env.${key}`] = JSON.stringify(value)
    define[`import.meta.env.${key}`] = JSON.stringify(value)
  }

  return define
}
