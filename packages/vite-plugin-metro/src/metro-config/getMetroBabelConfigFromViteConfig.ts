import type { ResolvedConfig } from 'vite'
import type { TransformOptions } from '@babel/core'

/**
 * Creates babel config for Metro transforms from Vite config.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_NATIVE, ONE_PLATFORM, TAMAGUI_ENVIRONMENT)
 * are handled by the import-meta-env-plugin based on caller.platform and always take precedence.
 * EXPO_OS is preserved as a native-only alias of ONE_PLATFORM (ios/android); it is never
 * synthesized for web so ssr does not invent an expo runtime value.
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

  // one defaults to ONE_PUBLIC_*; expo compat is additive, never a throw.
  const envPrefix = config.envPrefix || ['VITE_', 'ONE_PUBLIC_']
  const prefixes = Array.isArray(envPrefix) ? envPrefix : [envPrefix]

  for (const key of Object.keys(config.env)) {
    // expo compat: EXPO_PUBLIC_* is accepted even when the app defaults to
    // ONE_PUBLIC_*. each prefix keeps its own values; no cross-aliasing.
    if (key.startsWith('EXPO_PUBLIC_')) {
      importMetaEnv[key] = process.env[key] ?? (config.env as any)[key]
      continue
    }
    if (prefixes.some((p) => key.startsWith(p))) {
      importMetaEnv[key] = process.env[key] ?? (config.env as any)[key]
    }
  }

  // vite filters config.env by envPrefix, so an app defaulting to ONE_PUBLIC_*
  // never sees EXPO_PUBLIC_* there. pick those up from the shell, which one/vite
  // also populates from .env files. each prefix keeps its own values.
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('EXPO_PUBLIC_')) continue
    if (key in importMetaEnv) continue
    if (value === undefined) continue
    importMetaEnv[key] = value
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
    const key = m[1]!
    if (key in importMetaEnv) continue
    // EXPO_OS is an exact native alias; preserve an explicit define and let the
    // platform env stay authoritative on native. never synthesized for web here.
    if (key === 'EXPO_OS') {
      const raw = (config.define as any)[defineKey]
      try {
        importMetaEnv[key] = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        importMetaEnv[key] = raw as string
      }
      continue
    }
    if (!definePrefixes.some((p) => key.startsWith(p))) continue
    const raw = (config.define as any)[defineKey]
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
