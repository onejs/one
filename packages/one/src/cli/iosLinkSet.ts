import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type Catalog = {
  groups: Record<string, { components: string[]; hybrids: string[] }>
}

// the file the pod reads at install time: the groups a release build links.
export const IOS_LINK_SET_FILE = 'ios/one-link-set.json'

function readCatalog(): Catalog {
  let dir = typeof __dirname === 'string' ? __dirname : dirname(fileURLToPath(import.meta.url))
  while (!existsSync(join(dir, 'ios-link-set.json'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error('[one] ios-link-set.json not found beside the one package')
    dir = parent
  }
  return JSON.parse(readFileSync(join(dir, 'ios-link-set.json'), 'utf8'))
}

// the groups whose native names the production bundle references. a name the bundle
// drops with tree shaking costs nothing, so an unused feature stays out of the binary.
export function groupsInBundle(bundle: string, catalog = readCatalog()): string[] {
  const named = (name: string) => new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`).test(bundle)
  return Object.entries(catalog.groups)
    .filter(([, { components, hybrids }]) => [...components, ...hybrids].some(named))
    .map(([group]) => group)
}

// builds the production native bundle the way the xcode bundle phase does and
// records which groups it uses.
export function writeIosLinkSet(root: string) {
  const cli = createRequire(join(root, 'package.json')).resolve(
    createRequire(createRequire(join(root, 'package.json')).resolve('vxrn/package.json')).resolve(
      '@react-native-community/cli/build/bin.js'
    )
  )
  const out = mkdtempSync(join(tmpdir(), 'one-link-set-'))
  const bundlePath = join(out, 'main.jsbundle')
  try {
    execFileSync(
      process.execPath,
      [cli, 'bundle', '--platform', 'ios', '--dev', 'false', '--entry-file', 'index.js',
        '--bundle-output', bundlePath, '--assets-dest', out],
      { cwd: root, stdio: 'inherit' }
    )
    const groups = groupsInBundle(readFileSync(bundlePath, 'utf8'))
    writeFileSync(join(root, IOS_LINK_SET_FILE), JSON.stringify({ groups }, null, 2) + '\n')
    return groups
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}
