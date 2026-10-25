import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LinkSetCatalog } from './iosLinkSetAnalysis'

// the file the pod reads at install time: the groups a release build links.
export const IOS_LINK_SET_FILE = 'ios/one-link-set.json'

// the bundle phase writes the groups the shipped bundle needs here when set
export const IOS_LINK_SET_REPORT_ENV = 'ONE_IOS_LINK_SET_REPORT'

export function readCatalog(): LinkSetCatalog {
  return JSON.parse(readFileSync(join(oneDirectory(), 'ios-link-set.json'), 'utf8'))
}

// the directory of the one package, whose own sources are not the app's use of it
export function oneDirectory(): string {
  let dir = typeof __dirname === 'string' ? __dirname : dirname(fileURLToPath(import.meta.url))
  while (!existsSync(join(dir, 'ios-link-set.json'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error('[one] ios-link-set.json not found beside the one package')
    dir = parent
  }
  return dir
}

// the groups the pod compiled into a configuration, read from the build settings
// cocoapods wrote at pod install. undefined for a configuration that links every group.
export function compiledGroups(podsRoot: string, configuration: string): string[] | undefined {
  const file = join(podsRoot, 'Target Support Files', 'One', `One.${configuration.toLowerCase()}.xcconfig`)
  if (!existsSync(file)) return undefined
  const line = readFileSync(file, 'utf8')
    .split('\n')
    .find((text) => text.startsWith('SWIFT_ACTIVE_COMPILATION_CONDITIONS ='))
  if (line === undefined) return []
  const flags = new Set(line.match(/ONE_GROUP_[A-Z0-9_]+/g))
  return Object.keys(readCatalog().groups).filter((group) => flags.has(`ONE_GROUP_${group.toUpperCase()}`))
}

// fails a release build whose shipped bundle needs a group the binary left out
export function assertLinkSet(needed: string[], env: NodeJS.ProcessEnv = process.env) {
  const { PODS_ROOT: podsRoot, CONFIGURATION: configuration } = env
  if (!podsRoot || !configuration || configuration === 'Debug') return
  const compiled = compiledGroups(podsRoot, configuration)
  if (!compiled) return
  const missing = needed.filter((group) => !compiled.includes(group))
  if (!missing.length) return
  throw new Error(
    `[one] this ${configuration} build compiled out the ${missing.join(', ')} feature group${missing.length > 1 ? 's' : ''} that the app's JavaScript uses (compiled: ${compiled.join(', ') || 'none'}). The iOS link set is fixed when pods install. Run \`one prebuild --platform ios\` and build again.`
  )
}

// builds the production native bundle the way the xcode bundle phase does and
// records which groups its module graph uses.
export function writeIosLinkSet(root: string) {
  const cli = createRequire(join(root, 'package.json')).resolve(
    createRequire(createRequire(join(root, 'package.json')).resolve('vxrn/package.json')).resolve(
      '@react-native-community/cli/build/bin.js'
    )
  )
  const out = mkdtempSync(join(tmpdir(), 'one-link-set-'))
  const bundlePath = join(out, 'main.jsbundle')
  const reportPath = join(out, 'link-set-report.json')
  try {
    execFileSync(
      process.execPath,
      [cli, 'bundle', '--platform', 'ios', '--dev', 'false', '--entry-file', 'index.js',
        '--bundle-output', bundlePath, '--assets-dest', out],
      { cwd: root, stdio: 'inherit', env: { ...process.env, [IOS_LINK_SET_REPORT_ENV]: reportPath } }
    )
    // a bundler without the analysis plugin (metro) leaves no report, so link everything
    let groups: string[]
    if (existsSync(reportPath)) groups = JSON.parse(readFileSync(reportPath, 'utf8')).groups
    else {
      groups = Object.keys(readCatalog().groups)
      console.warn('[one] the bundler produced no link set report, so a release build links every iOS feature group')
    }
    writeFileSync(join(root, IOS_LINK_SET_FILE), JSON.stringify({ groups }, null, 2) + '\n')
    return groups
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}
