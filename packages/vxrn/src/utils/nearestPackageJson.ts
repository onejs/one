import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'

// rolldown gives a module node's cjs interop (`__toESM(require_x(), 1)`) when
// the package.json its resolver found says "type": "module". an id a plugin
// resolves carries no package.json unless the plugin passes one, so a module
// reached both through a plugin and through the native resolver takes the
// interop of whichever resolution landed first, and chunk hashes change from
// build to build. plugins that resolve files return this with the id.
const nearestByDir = new Map<string, string | undefined>()

export function nearestPackageJson(file: string): string | undefined {
  if (!isAbsolute(file)) return undefined
  const dir = dirname(file)
  if (nearestByDir.has(dir)) return nearestByDir.get(dir)
  const candidate = join(dir, 'package.json')
  const found = existsSync(candidate)
    ? candidate
    : dirname(dir) === dir
      ? undefined
      : nearestPackageJson(dir)
  nearestByDir.set(dir, found)
  return found
}
