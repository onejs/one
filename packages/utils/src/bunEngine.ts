import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const BUN_ENGINE_PODFILE_MARKER = "# [vxrn/one] bun engine"

function hasBunExpoPluginConfig(configPath: string): boolean {
  if (!existsSync(configPath)) return false
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8"))
    const plugins = parsed?.plugins ?? parsed?.expo?.plugins
    if (!Array.isArray(plugins)) return false
    return plugins.some(
      (entry: unknown) =>
        Array.isArray(entry) &&
        entry[0] === "vxrn/expo-plugin" &&
        typeof entry[1] === "object" &&
        entry[1] !== null &&
        (entry[1] as { engine?: unknown }).engine === "bun"
    )
  } catch {
    return false
  }
}

/**
 * Returns true only when the Bun ahead-of-time engine is explicitly enabled for
 * an iOS build. Over-the-air updates always compile for Hermes and explicitly
 * override this with ONE_BUN_ENGINE=0.
 */
export function isBunIosEngine(
  root?: string,
  platform?: string | null
): boolean {
  if (platform !== "ios") return false
  if (process.env.ONE_BUN_ENGINE === "0") return false
  if (process.env.ONE_BUN_ENGINE === "1") return true

  const configured = (globalThis as {
    __vxrnNativeIosEngine?: { root: string; engine?: string }
  }).__vxrnNativeIosEngine
  if (configured?.engine === "bun") {
    if (!root || resolve(root) === configured.root) {
      return true
    }
  }

  if (!root) return false

  const podfilePath = join(root, "ios", "Podfile")
  if (existsSync(podfilePath)) {
    try {
      if (readFileSync(podfilePath, "utf8").includes(BUN_ENGINE_PODFILE_MARKER)) {
        return true
      }
    } catch {}
  }

  return (
    hasBunExpoPluginConfig(join(root, "app.json")) ||
    hasBunExpoPluginConfig(join(root, "app.config.json"))
  )
}
