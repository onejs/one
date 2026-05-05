import type { ResolvedConfig } from 'vite'
import type { TransformOptions } from '@babel/core'

/**
 * Creates babel config for Metro transforms from Vite config.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_NATIVE, EXPO_OS, TAMAGUI_ENVIRONMENT)
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

  // also harvest keys from config.define (populated by env-defining plugins like one's).
  // we union the user's envPrefix with framework-level defaults so we still pick up
  // VITE_/ONE_/EXPO_PUBLIC_ even when another plugin replaces envPrefix wholesale
  // (e.g. some plugins set it to a single project-specific prefix).
  const definePrefixes = Array.from(
    new Set([...prefixes, 'VITE_', 'ONE_', 'EXPO_PUBLIC_'])
  )
  for (const defineKey of Object.keys(config.define || {})) {
    const m = defineKey.match(/^process\.env\.([A-Z][A-Z0-9_]*)$/)
    if (!m) continue
    const key = m[1]
    if (key in importMetaEnv) continue
    if (!definePrefixes.some((p) => key.startsWith(p))) continue
    const raw = config.define![defineKey]
    try {
      importMetaEnv[key] = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      importMetaEnv[key] = raw as string
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
