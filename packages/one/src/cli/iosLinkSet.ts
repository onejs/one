import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type Catalog = {
  groups: Record<string, { components: string[]; hybrids: string[]; uses?: string[] }>
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

// the groups whose features the production bundle uses. without the `One` or
// `One.iOS` namespace objects the bundle names a hybrid or component only where
// tree shaking kept its use, so the name is the signal. those objects hold every
// feature, so once the bundle keeps one, a group counts as used when the bundle
// reads one of its public names off it (`One.Purchases`, `One.iOS.Chart`,
// `{ Chart } = One.iOS`). the `Swift.Chart requires an iOS native build` strings
// of the unavailable stubs are not reads, and a computed read (`One.iOS[name]`)
// keeps every group.
export function groupsInBundle(bundle: string, catalog = readCatalog()): string[] {
  const named = (name: string) => new RegExp(`(?<![A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(bundle)
  const namespaced =
    /get platform\(\)\s*\{\s*return currentPlatform\(\)/.test(bundle) || /Swift\.\w+ requires an iOS native build/.test(bundle)
  const computed = /\b(?:One|iOS)\s*\[/.test(bundle)
  const read = (name: string) =>
    new RegExp(`(?<!Swift)\\.${name}(?![A-Za-z0-9_$])`).test(bundle) ||
    new RegExp(`\\{[^{}]*(?<![A-Za-z0-9_$.])${name}(?![A-Za-z0-9_$])[^{}]*\\}\\s*=\\s*[A-Za-z0-9_$.]*\\b(?:One|iOS)\\b`).test(bundle)
  return Object.entries(catalog.groups)
    .filter(([, { components, hybrids, uses = [] }]) =>
      namespaced
        ? computed || [...components.map((component) => component.replace(/^OneNative/, '')), ...uses].some(read)
        : [...components, ...hybrids].some(named)
    )
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
