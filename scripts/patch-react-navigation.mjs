// patches @react-navigation/core package.json exports to expose internal contexts
// needed for SSR-optimized NavigationContainer
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const pkgPath = join(process.cwd(), 'node_modules/@react-navigation/core/package.json')
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const exports = pkg.exports || {}
  const paths = [
    './lib/module/NavigationBuilderContext',
    './lib/module/NavigationStateContext',
    './lib/module/EnsureSingleNavigator',
  ]
  let changed = false
  for (const p of paths) {
    if (!exports[p]) {
      exports[p] = p + '.js'
      changed = true
    }
  }
  if (changed) {
    pkg.exports = exports
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  }
} catch {}
