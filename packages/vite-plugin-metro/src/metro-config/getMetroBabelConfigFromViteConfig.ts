import type { ResolvedConfig } from 'vite'
import type { TransformOptions } from '@babel/core'

/**
 * Creates babel config for Metro transforms from Vite config.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_PLATFORM, EXPO_OS, TAMAGUI_ENVIRONMENT)
 * are handled by the import-meta-env-plugin based on caller.platform and always take precedence.
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

  const envPrefix = config.envPrefix || ['VITE_', 'EXPO_PUBLIC_']
  const prefixes = Array.isArray(envPrefix) ? envPrefix : [envPrefix]

  for (const key of Object.keys(config.env)) {
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
