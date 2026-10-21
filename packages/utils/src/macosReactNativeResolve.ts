import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'

const IOS_EXTENSIONS = ['.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js']
const OVERRIDE_EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js']

const reactNativeRootCache = new Map<string, string | null>()

export function findOneMacosPackageRoot(appRoot: string): string | null {
  try {
    const req = createRequire(join(appRoot, 'package.json'))
    return dirname(req.resolve('one-macos/package.json'))
  } catch {
    // the package is not installed on this app. walk to a workspace checkout.
  }
  let dir = appRoot
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'packages/one-macos/package.json')
    if (existsSync(candidate)) return dirname(candidate)
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function reactNativeRootOf(importerFile: string): string | null {
  const start = dirname(importerFile)
  const cached = reactNativeRootCache.get(start)
  if (cached !== undefined) return cached
  let dir = start
  let found: string | null = null
  for (let i = 0; i < 12; i++) {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        const name = JSON.parse(readFileSync(manifest, 'utf8')).name
        if (name === 'react-native') found = realpathSync(dir)
      } catch {
        found = null
      }
      break
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  reactNativeRootCache.set(start, found)
  return found
}

function fileIfPresent(path: string): string | null {
  if (!existsSync(path)) return null
  try {
    return statSync(path).isFile() ? path : null
  } catch {
    return null
  }
}

/**
 * macOS loads react-native's iOS implementation, except for files the
 * one-macos package overrides. App code and other packages do not get this
 * fallback. Returns an absolute file, or null to keep the normal resolver.
 */
export function macosReactNativeFile(
  importerFile: string | undefined,
  source: string,
  oneMacosRoot: string | null
): string | null {
  if (!importerFile || !source.startsWith('.')) return null
  const rnRoot = reactNativeRootOf(importerFile)
  if (!rnRoot) return null
  let importerReal: string
  try {
    importerReal = realpathSync(dirname(importerFile))
  } catch {
    return null
  }
  const fromRoot = relative(rnRoot, importerReal)
  if (fromRoot.startsWith('..')) return null

  const target = resolve(dirname(importerFile), source)
  if (oneMacosRoot) {
    const overrideBase = join(oneMacosRoot, 'src/react-native', relative(rnRoot, target))
    for (const ext of OVERRIDE_EXTENSIONS) {
      const file = fileIfPresent(overrideBase + ext)
      if (file) return file
    }
  }
  for (const ext of IOS_EXTENSIONS) {
    const file = fileIfPresent(target + ext)
    if (file) return file
  }
  return null
}
