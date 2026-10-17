// reads the public api of every ios sdk module from apple's symbol graphs. the
// graphs carry objective-c frameworks as swift sees them and swift-only
// frameworks alike, so one reader covers the whole sdk.
import { execFile, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
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
}

export type Relationship = { kind: string; source: string; target: string; targetFallback?: string }

export type Graph = { module: string; symbols: Symbol[]; relationships: Relationship[] }

export const sdkPath = () =>
  execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { encoding: 'utf8' }).trim()

export const sdkVersion = () =>
  execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-version'], { encoding: 'utf8' }).trim()

// every public framework that ships a module. underscored frameworks are swift
// overlays and private plumbing; the swiftui overlays are read by the swiftui
// generator, so they stay out of this universe.
export function sdkModules(sdk = sdkPath()): string[] {
  const dir = join(sdk, 'System/Library/Frameworks')
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.framework') && !entry.startsWith('_'))
    .map((entry) => entry.slice(0, -'.framework'.length))
    .filter((module) => existsSync(join(dir, `${module}.framework/Modules`)))
    .sort()
}

function cacheDir(root: string, version: string) {
  const dir = join(root, '.codegen-cache', `sdk-graphs-${version}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

// extracts the graphs the cache lacks, a few at a time. a module the extractor
// cannot load is reported with its error, never dropped.
export async function extractGraphs(
  root: string,
  modules: string[],
  { concurrency = 6, minimumIos = '18.0' } = {}
): Promise<{ extracted: string[]; failed: { module: string; error: string }[] }> {
  const sdk = sdkPath()
  const dir = cacheDir(root, sdkVersion())
  const pending = modules.filter((module) => !existsSync(join(dir, `${module}.symbols.json`)))
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
// (`HealthKit@Foundation.symbols.json`), which hold members it adds to them.
export function loadGraph(root: string, module: string): Graph | null {
  const dir = cacheDir(root, sdkVersion())
  const main = join(dir, `${module}.symbols.json`)
  if (!existsSync(main)) return null
  const files = [main, ...readdirSync(dir)
    .filter((file) => file.startsWith(`${module}@`) && file.endsWith('.symbols.json'))
    .map((file) => join(dir, file))]
  const graph: Graph = { module, symbols: [], relationships: [] }
  for (const file of files) {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { symbols: Symbol[]; relationships?: Relationship[] }
    graph.symbols.push(...data.symbols)
    graph.relationships.push(...(data.relationships ?? []))
  }
  return graph
}
