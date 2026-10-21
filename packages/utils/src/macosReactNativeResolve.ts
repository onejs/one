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
    return null
  }
}

export function requireOneMacosPackageRoot(appRoot: string): string {
  const root = findOneMacosPackageRoot(appRoot)
  if (!root) {
    throw new Error(
      `macos build cannot resolve one-macos from ${appRoot}. Add "one-macos" as a dependency.`
    )
  }
  return root
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

const PLATFORM_MODULE = 'Libraries/Utilities/Platform'
const BARE_PLATFORM = /^react-native\/Libraries\/Utilities\/Platform(?:\.(?:js|ts|tsx|jsx))?$/

function slashRelative(from: string, to: string): string {
  return relative(from, to).split('\\').join('/')
}

function isPackageEntry(importerFile: string, rnRoot: string): boolean {
  try {
    return slashRelative(rnRoot, realpathSync(importerFile)) === 'index.js'
  } catch {
    return false
  }
}

function isPlatformTarget(rnRoot: string, target: string): boolean {
  const rel = slashRelative(rnRoot, target).replace(/\.(tsx|ts|jsx|js)$/, '')
  return rel === PLATFORM_MODULE
}

function platformOverrideFile(oneMacosRoot: string): string | null {
  return fileIfPresent(join(oneMacosRoot, 'src/react-native', PLATFORM_MODULE + '.js'))
}

/**
 * macOS loads react-native's iOS files, and only for importers inside that
 * package. React Native's own modules keep Platform.ios.js, so Platform.OS
 * stays ios there. The package entry and every importer outside react-native
 * get the one-macos Platform override, where OS is macos. Returns an absolute
 * file, or null to keep the normal resolver.
 */
export function macosReactNativeFile(
  importerFile: string | undefined,
  source: string,
  oneMacosRoot: string | null
): string | null {
  if (BARE_PLATFORM.test(source)) {
    if (!oneMacosRoot) return null
    if (importerFile) {
      const rnRoot = reactNativeRootOf(importerFile)
      if (rnRoot && !isPackageEntry(importerFile, rnRoot)) {
        let dir = dirname(importerFile)
        try {
          dir = realpathSync(dir)
        } catch {
          // keep the unresolved directory
        }
        const inside = slashRelative(rnRoot, dir)
        if (!inside.startsWith('..')) return null
      }
    }
    return platformOverrideFile(oneMacosRoot)
  }

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
  // the package entry re-exports Platform. its importer is index.js, so the
  // public Platform is the override, while library files keep the ios one.
  const internalPlatform = isPlatformTarget(rnRoot, target) && !isPackageEntry(importerFile, rnRoot)
  if (oneMacosRoot && !internalPlatform) {
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
