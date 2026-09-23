import { existsSync } from 'node:fs'
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
