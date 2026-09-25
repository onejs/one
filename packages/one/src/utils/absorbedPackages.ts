import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolvePath } from '@vxrn/resolve'

// packages one absorbs, by the directory of one's own copy. libraries that
// import one of them (react navigation reads react-native-safe-area-context
// for its header height) reach one's copy, so they share what One exposes.
const absorbedPackages = {
  'react-native-safe-area-context': 'safe-area-context',
}

// an app that declares an absorbed package in its own package.json keeps its
// copy, so only the undeclared ones are absorbed.
function undeclaredAbsorbedPackages(root: string): [string, string][] {
  const app = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const declared = { ...app.dependencies, ...app.devDependencies }
  return Object.entries(absorbedPackages).filter(([name]) => !(name in declared))
}

// the absorbed packages' names, for autolinking: libraries that list one as a
// peer dependency would otherwise link its native code next to one's.
export function absorbedPackageNames(root: string): string[] {
  return undeclaredAbsorbedPackages(root).map(([name]) => name)
}

// the alias map for one platform.
export function absorbedPackageAliases(
  root: string,
  platform: 'web' | 'native'
): Record<string, string> {
  const absorbed = undeclaredAbsorbedPackages(root)
  if (!absorbed.length) return {}
  const oneRoot = path.dirname(resolvePath('one/package.json', root))
  const entry = platform === 'web' ? 'index.mjs' : 'index.native.js'
  return Object.fromEntries(
    absorbed.map(([name, dir]) => [name, path.join(oneRoot, 'dist', 'esm', dir, entry)])
  )
}
