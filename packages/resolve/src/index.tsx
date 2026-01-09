import module from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'

/**
 * Resolves a module path from the specified directory.
 * For npm packages, returns the ESM entry point when available.
 */
export const resolvePath = (path: string, from = process.cwd()): string => {
  const require = module.createRequire(from.endsWith('/') ? from : from + '/')
  const resolved = require.resolve(path, { paths: [from] })

  // For relative paths or node: builtins, just return the resolved path
  const isRelative = path.startsWith('./') || path.startsWith('../')
  const isBuiltin = path.startsWith('node:')
  if (isRelative || isBuiltin) {
    return resolved
  }

  // For npm packages, try to find ESM entry point from package.json
  try {
    const pkgJsonPath = require.resolve(`${path}/package.json`, { paths: [from] })
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
    const pkgDir = dirname(pkgJsonPath)

    // Check exports["."].import first (most accurate for ESM)
    const exportsImport = pkgJson.exports?.['.']?.import
    if (exportsImport) {
      // Handle nested structure like { import: { types: "...", default: "..." } }
      const importPath =
        typeof exportsImport === 'string' ? exportsImport : exportsImport.default
      if (importPath) {
        return join(pkgDir, importPath)
      }
    }

    // Fall back to module field
    if (pkgJson.module) {
      return join(pkgDir, pkgJson.module)
    }
  } catch {
    // Fall back to resolved path if we can't read package.json
  }

  return resolved
}
