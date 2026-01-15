export type Platform = 'ios' | 'android' | 'web'
export type ViteEnvironment = 'client' | 'ssr' | 'ios' | 'android'

export type PlatformEnv = {
  VITE_ENVIRONMENT: ViteEnvironment
  VITE_PLATFORM: 'web' | 'native'
  EXPO_OS: 'web' | 'ios' | 'android'
  TAMAGUI_ENVIRONMENT: ViteEnvironment
}

const platformEnvMap: Record<ViteEnvironment, PlatformEnv> = {
  client: {
    VITE_ENVIRONMENT: 'client',
    VITE_PLATFORM: 'web',
    EXPO_OS: 'web',
    TAMAGUI_ENVIRONMENT: 'client',
  },
  ssr: {
    VITE_ENVIRONMENT: 'ssr',
    VITE_PLATFORM: 'web',
    EXPO_OS: 'web',
    TAMAGUI_ENVIRONMENT: 'ssr',
  },
  ios: {
    VITE_ENVIRONMENT: 'ios',
    VITE_PLATFORM: 'native',
    EXPO_OS: 'ios',
    TAMAGUI_ENVIRONMENT: 'ios',
  },
  android: {
    VITE_ENVIRONMENT: 'android',
    VITE_PLATFORM: 'native',
    EXPO_OS: 'android',
    TAMAGUI_ENVIRONMENT: 'android',
  },
}

export function getPlatformEnv(environment: ViteEnvironment): PlatformEnv {
  return platformEnvMap[environment]
}

export function metroPlatformToViteEnvironment(
  platform: Platform | string | null | undefined
): ViteEnvironment {
  if (platform === 'ios') return 'ios'
  if (platform === 'android') return 'android'
  return 'client'
}

/**
 * Format platform env for Vite's define config.
 * Returns both process.env.* and import.meta.env.* definitions.
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
