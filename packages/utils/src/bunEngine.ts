import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const BUN_ENGINE_MARKER = '[vxrn/one] bun engine'

function hasBunExpoPluginConfig(configPath: string): boolean {
  if (!existsSync(configPath)) return false
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'))
    const plugins = parsed?.plugins ?? parsed?.expo?.plugins
    if (!Array.isArray(plugins)) return false
    return plugins.some(
      (entry: unknown) =>
        Array.isArray(entry) &&
        entry[0] === 'vxrn/expo-plugin' &&
        typeof entry[1] === 'object' &&
        entry[1] !== null &&
        (entry[1] as { engine?: unknown }).engine === 'bun'
    )
  } catch {
    return false
  }
}

/**
 * Returns true only when the Bun ahead-of-time engine is explicitly enabled for
 * an iOS or Android build. Over-the-air updates always compile for Hermes and explicitly
 * override this with ONE_BUN_ENGINE=0.
 */
export function isBunEngine(root?: string, platform?: string | null): boolean {
  if (platform !== 'ios' && platform !== 'android') return false
  if (process.env.ONE_BUN_ENGINE === '0') return false
  if (process.env.ONE_BUN_ENGINE === '1') return true

  const configured = (
    globalThis as {
      __vxrnNativeEngine?: { root: string; ios?: string; android?: string }
    }
  ).__vxrnNativeEngine
  if (configured?.[platform] === 'bun') {
    if (!root || resolve(root) === configured.root) {
      return true
    }
  }

  if (!root) return false

  const nativeProjectPath =
    platform === 'ios'
      ? join(root, 'ios', 'Podfile')
      : join(root, 'android', 'app', 'build.gradle')
  if (existsSync(nativeProjectPath)) {
    try {
      if (readFileSync(nativeProjectPath, 'utf8').includes(BUN_ENGINE_MARKER)) {
        return true
      }
    } catch {}
  }

  return (
    platform === 'ios' &&
    (hasBunExpoPluginConfig(join(root, 'app.json')) ||
      hasBunExpoPluginConfig(join(root, 'app.config.json')))
  )
}
