import type { ResolvedConfig } from 'vite'
import type { TransformOptions } from '@babel/core'

// Platform-specific keys handled by the babel plugin via caller.platform
const PLATFORM_ENV_KEYS = new Set([
  'VITE_ENVIRONMENT',
  'VITE_PLATFORM',
  'EXPO_OS',
  'TAMAGUI_ENVIRONMENT',
])

/**
 * Creates babel config for Metro transforms from Vite config.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_PLATFORM, EXPO_OS)
 * are handled automatically by the import-meta-env-plugin based on caller.platform.
 */
export function getMetroBabelConfigFromViteConfig(
  config: ResolvedConfig
): TransformOptions {
  const importMetaEnv: Record<string, string | boolean | undefined> = {
    MODE: config.mode,
    BASE_URL: config.base,
    PROD: config.mode === 'production',
    DEV: config.mode === 'development',
    SSR: false,
  }

  const envPrefix = config.envPrefix || 'VITE_'
  const prefixes = Array.isArray(envPrefix) ? envPrefix : [envPrefix]

  for (const key of Object.keys(config.env)) {
    if (PLATFORM_ENV_KEYS.has(key)) continue
    if (prefixes.some((p) => key.startsWith(p))) {
      importMetaEnv[key] = process.env[key]
    }
  }

  return {
    plugins: [
      [
        '@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin',
        { env: importMetaEnv },
      ],
    ],
  }
}
