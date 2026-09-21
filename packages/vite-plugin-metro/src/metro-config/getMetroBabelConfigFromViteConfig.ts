import type { ResolvedConfig } from 'vite'
import type { TransformOptions } from '@babel/core'

/**
 * Creates babel config for Metro transforms from Vite config.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_NATIVE, ONE_PLATFORM, EXPO_OS, TAMAGUI_ENVIRONMENT)
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

  const envPrefix = config.envPrefix || ['VITE_', 'ONE_PUBLIC_']
  const prefixes = Array.isArray(envPrefix) ? envPrefix : [envPrefix]

  for (const key of Object.keys(config.env)) {
    if (key.startsWith('EXPO_PUBLIC_') || prefixes.some((p) => key.startsWith(p))) {
      importMetaEnv[key] = process.env[key] ?? config.env[key]
    }
  }

  // vite filters config.env by envPrefix. expo packages still read their
  // public prefix internally, so include explicit shell values as well.
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('EXPO_PUBLIC_') && value !== undefined) {
      importMetaEnv[key] ??= value
    }
  }

  // also harvest keys from config.define (populated by env-defining plugins like one's).
  // we union the user's envPrefix with framework-level defaults so we still pick up
  // VITE_/ONE_PUBLIC_/ONE_/EXPO_PUBLIC_ even when another plugin replaces envPrefix wholesale
  // (e.g. some plugins set it to a single project-specific prefix).
  const definePrefixes = Array.from(
    new Set([...prefixes, 'VITE_', 'ONE_PUBLIC_', 'ONE_', 'EXPO_PUBLIC_'])
  )
  for (const defineKey of Object.keys(config.define || {})) {
    const m = defineKey.match(/^process\.env\.([A-Z][A-Z0-9_]*)$/)
    if (!m) continue
    const key = m[1]
    if (key in importMetaEnv) continue
    if (key !== 'EXPO_OS' && !definePrefixes.some((p) => key.startsWith(p))) continue
    const raw = config.define![defineKey]
    try {
      importMetaEnv[key] = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      importMetaEnv[key] = raw as string
    }
  }

  // expo libraries often use the same public switch under expo's prefix.
  // shadow only an absent same-suffix key; explicit expo values win.
  for (const [key, value] of Object.entries(importMetaEnv)) {
    if (!key.startsWith('ONE_PUBLIC_')) continue
    const expoKey = `EXPO_PUBLIC_${key.slice('ONE_PUBLIC_'.length)}`
    importMetaEnv[expoKey] ??= value
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
