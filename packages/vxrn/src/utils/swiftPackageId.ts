import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

// a swift package in an app is the directory holding its Package.swift. prebuild
// names its pod by this id and the bundler names the host view the same way.
export function swiftPackageId(packageDir: string) {
  return basename(packageDir).replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1')
}

export function swiftPackageDirOf(file: string): string | undefined {
  for (let dir = dirname(file); dirname(dir) !== dir; dir = dirname(dir)) {
    if (existsSync(join(dir, 'Package.swift'))) return dir
  }
}

// prebuild and dev servers must address the same package by the same name.
export function swiftPackageDirectories(root: string): Map<string, string> {
  const skip = new Set(['node_modules', 'ios', 'android', 'dist', 'types', 'build'])
  const packages = new Map<string, string>()
  const walk = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true })
    if (entries.some((entry) => entry.isFile() && entry.name === 'Package.swift')) {
      const name = swiftPackageId(dir)
      const previous = packages.get(name)
      if (previous) {
        throw new Error(`[vxrn] swift packages ${previous} and ${dir} both have name ${name}`)
      }
      packages.set(name, dir)
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || skip.has(entry.name)) continue
      walk(join(dir, entry.name))
    }
  }
  walk(root)
  return packages
}
