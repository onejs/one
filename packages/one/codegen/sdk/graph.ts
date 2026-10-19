// reads the public api of every ios sdk module from apple's symbol graphs. the
// graphs carry objective-c frameworks as swift sees them and swift-only
// frameworks alike, so one reader covers the whole sdk.
import { execFile, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export type Fragment = { kind: string; spelling: string; preciseIdentifier?: string }

export type Symbol = {
  kind: { identifier: string }
  identifier: { precise: string }
  pathComponents: string[]
  names: { title: string }
  accessLevel: string
  declarationFragments?: Fragment[]
  functionSignature?: {
    parameters?: { name: string; internalName?: string; declarationFragments: Fragment[] }[]
    returns?: Fragment[]
  }
  availability?: {
    domain: string
    introduced?: { major: number; minor?: number }
    deprecated?: { major: number; minor?: number }
    obsoleted?: { major: number }
    isUnconditionallyUnavailable?: boolean
    isUnconditionallyDeprecated?: boolean
  }[]
  swiftGenerics?: { parameters?: { name: string }[]; constraints?: unknown[] }
  swiftExtension?: { extendedModule: string; constraints?: unknown[] }
  location?: { uri: string }
  // set by addInheritedInitializers for init() the graph omits; the checker
  // uses it to tell synthesized initializers from declared legal ones
  synthesizedInit?: true
}

export type Relationship = { kind: string; source: string; target: string; targetFallback?: string }

export type Graph = { module: string; symbols: Symbol[]; relationships: Relationship[] }

export const sdkPath = () =>
  execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { encoding: 'utf8' }).trim()

export const sdkVersion = () =>
  execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-version'], { encoding: 'utf8' }).trim()

// every public module an app can import: each framework that ships a module,
// the cross-import overlays (`_MapKit_SwiftUI` holds what MapKit adds to
// SwiftUI) and modules that declare types a framework re-exports
// (`_LocationEssentials` declares CLLocation for CoreLocation), plus the
// swift-only system libraries. the standard library and the c library stay out.
const SWIFT_LIBRARIES = ['Dispatch', 'Distributed', 'ObjectiveC', 'Observation', 'RegexBuilder', 'Spatial', 'Synchronization', 'System']

export function sdkModules(sdk = sdkPath()): string[] {
  const dir = join(sdk, 'System/Library/Frameworks')
  const frameworks = readdirSync(dir)
    .filter((entry) => entry.endsWith('.framework'))
    .map((entry) => entry.slice(0, -'.framework'.length))
    .filter((module) => existsSync(join(dir, `${module}.framework/Modules`)))
  const libraries = SWIFT_LIBRARIES.filter((module) => existsSync(join(sdk, `usr/lib/swift/${module}.swiftmodule`)))
  return [...frameworks, ...libraries].sort()
}

// graphs depend only on the sdk, so every checkout shares one cache
function cacheDir(version: string) {
  const dir = join(homedir(), '.cache', 'one', 'sdk-graphs', version)
  mkdirSync(dir, { recursive: true })
  return dir
}

// extracts the graphs the cache lacks, a few at a time. a module the extractor
// cannot load is reported with its error, never dropped.
export async function extractGraphs(
  modules: string[],
  { concurrency = 6, minimumIos = '18.0' } = {}
): Promise<{ extracted: string[]; failed: { module: string; error: string }[] }> {
  const sdk = sdkPath()
  const dir = cacheDir(sdkVersion())
  const cached = new Set(readdirSync(dir).map((file) => file.split(/[.@]/)[0]))
  const pending = modules.filter((module) => !cached.has(module))
  const failed: { module: string; error: string }[] = []
  const extracted: string[] = []
  let next = 0
  const worker = async () => {
    while (next < pending.length) {
      const module = pending[next++]
      try {
        await run('xcrun', ['swift-symbolgraph-extract', '-module-name', module,
          '-target', `arm64-apple-ios${minimumIos}-simulator`, '-sdk', sdk,
          '-output-dir', dir, '-minimum-access-level', 'public'], { maxBuffer: 64 * 1024 * 1024 })
        extracted.push(module)
      } catch (error) {
        const text = error instanceof Error && 'stderr' in error ? String(error.stderr) : String(error)
        failed.push({ module, error: text.split('\n').find((line) => line.includes('error')) ?? text.slice(0, 200) })
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return { extracted, failed }
}

// a module's own graph plus the extension graphs it declares on other modules
// (`HealthKit@Foundation.symbols.json`), which hold members it adds to them. a
// cross-import overlay has only extension graphs.
export function loadGraph(module: string): Graph | null {
  const dir = cacheDir(sdkVersion())
  const files = readdirSync(dir)
    .filter((file) => (file === `${module}.symbols.json` || file.startsWith(`${module}@`)) && file.endsWith('.symbols.json'))
    .map((file) => join(dir, file))
  if (!files.length) return null
  const graph: Graph = { module, symbols: [], relationships: [] }
  for (const file of files) {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { symbols: Symbol[]; relationships?: Relationship[] }
    graph.symbols.push(...data.symbols)
    graph.relationships.push(...(data.relationships ?? []))
  }
  addInheritedInitializers(graph)
  return graph
}

// an objective-c class inherits -init from NSObject, but a symbol graph lists
// only the initializers a class declares, and lists none it marks unavailable.
// each subclass that declares no init() gets one, marked synthesized so the
// inherited-init checker can probe it; the compilers reject it where the class
// makes init unavailable, and generation drops it with that reason.
function addInheritedInitializers(graph: Graph) {
  const subclasses = new Set(graph.relationships.filter((r) => r.kind === 'inheritsFrom').map((r) => r.source))
  const declared = new Set(graph.symbols.filter((s) => s.kind.identifier === 'swift.init' && s.pathComponents.at(-1) === 'init()')
    .map((s) => s.pathComponents.slice(0, -1).join('.')))
  for (const owner of graph.symbols.filter((s) => s.kind.identifier === 'swift.class')) {
    const usr = owner.identifier.precise
    if (!usr.startsWith('c:objc(cs)') || !subclasses.has(usr) || declared.has(owner.pathComponents.join('.'))) continue
    const init = `${usr}(im)init`
    graph.symbols.push({
      kind: { identifier: 'swift.init' },
      identifier: { precise: init },
      pathComponents: [...owner.pathComponents, 'init()'],
      names: { title: 'init()' },
      accessLevel: owner.accessLevel,
      declarationFragments: [{ kind: 'keyword', spelling: 'init' }, { kind: 'text', spelling: '()' }],
      functionSignature: { parameters: [] },
      synthesizedInit: true,
    })
    graph.relationships.push({ kind: 'memberOf', source: init, target: usr })
  }
}
