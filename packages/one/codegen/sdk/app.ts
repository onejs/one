// generates the sdk bindings one app uses. an app reaches a framework by
// importing `one/ios/<Framework>`; prebuild writes one pod holding the table of
// each imported framework, plus the conformances of every framework whose
// enums, option sets and constants those tables pass, so binary size follows
// the imports. output is cached per sdk and generator, so a second prebuild
// only copies files.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emitModule, typeUsrs, type Entry, type ModuleOutput } from './emit'
import { generateModule, prepare, RUNTIME } from './generate'
import { extractGraphs, loadGraph, sdkModules, sdkVersion } from './graph'

export const SDK_POD = 'OneSDKBindings'

const SKIP = new Set(['node_modules', 'ios', 'android', 'dist', 'build', 'types'])
const SOURCE = /\.(?:[cm]?[jt]sx?)$/
const IMPORT = /['"]one\/ios\/([A-Za-z_][A-Za-z0-9_]*)['"]/g

// every `one/ios/<Framework>` the app's own source names
export function importedFrameworks(root: string): string[] {
  const found = new Set<string>()
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (SOURCE.test(entry.name)) {
        for (const match of readFileSync(full, 'utf8').matchAll(IMPORT)) found.add(match[1])
      }
    }
  }
  walk(root)
  return [...found].sort()
}

// the generator's own source and the runtime it compiles against key the
// cache, so a changed generator never reuses old tables
function cacheDir() {
  const here = dirname(fileURLToPath(import.meta.url))
  const hash = createHash('sha256')
  for (const file of readdirSync(here).filter((f) => /\.(?:ts|mjs)$/.test(f)).sort()) hash.update(readFileSync(join(here, file)))
  hash.update(readFileSync(RUNTIME))
  const dir = join(homedir(), '.cache', 'one', 'sdk-bindings', `${sdkVersion()}-${hash.digest('hex').slice(0, 12)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

// `modules` names the frameworks declaring the types the entries pass
type Cached = { entries: Omit<Entry, 'swift'>[]; skipped: ModuleOutput['skipped']; modules: string[] }

function entryUsrs(entry: Omit<Entry, 'swift'>) {
  const types = [...entry.params.map((p) => p.type), ...(entry.returns ? [entry.returns] : []),
    ...Object.values(entry.specialization ?? {}), ...(entry.receiver ? [entry.receiver] : [])]
  return types.flatMap((type) => typeUsrs(type))
}

// generates (or reuses) the tables and conformances an app needs and returns
// the swift files to compile, keyed by file name
export async function generateAppSdk(frameworks: string[], log = console.info) {
  const known = new Set(sdkModules())
  const unknown = frameworks.filter((f) => !known.has(f))
  if (unknown.length) {
    throw new Error(`[one] one/ios/${unknown[0]} names no framework in the iOS ${sdkVersion()} SDK`)
  }
  const cache = cacheDir()
  const tableFile = (module: string) => join(cache, `OneSDK_${module}.swift`)
  const typesFile = (module: string) => join(cache, `OneSDK_${module}.types.swift`)
  const manifest = (module: string) => join(cache, `OneSDK_${module}.json`)

  let prepared: ReturnType<typeof prepare> | undefined
  const ready = async () => {
    if (prepared) return prepared
    await extractGraphs([...known])
    prepared = prepare()
    return prepared
  }
  const table = async (module: string): Promise<Cached> => {
    if (!existsSync(manifest(module))) {
      log(`[one] generating iOS bindings for ${module}`)
      const result = await generateModule(module, await ready(), cache)
      if (!result) throw new Error(`[one] no symbol graph for ${module}`)
      if (result.errors.length) throw new Error(`[one] ${module} bindings do not compile:\n${result.errors.join('\n')}`)
      const { entries, skipped } = result.output
      const { bridge } = await ready()
      const modules = new Set(entries.flatMap((entry) => entryUsrs(entry).map((usr) => bridge.index.get(usr)?.module ?? '')))
      modules.delete('')
      modules.delete(module)
      const cached: Cached = { entries: entries.map(({ swift, ...e }) => e), skipped, modules: [...modules].sort() }
      writeFileSync(manifest(module), JSON.stringify(cached))
    }
    return JSON.parse(readFileSync(manifest(module), 'utf8'))
  }
  // a framework the tables only pass values of contributes its conformances,
  // less those the compiler rejected for its table
  const types = async (module: string) => {
    if (existsSync(typesFile(module))) return
    const { skipped } = await table(module)
    const { bridge, symbols } = await ready()
    const exclude = new Map(skipped.filter((s) => s.reason.startsWith('compile:')).map((s) => [s.usr, s.reason]))
    writeFileSync(typesFile(module), emitModule(loadGraph(module)!, bridge, symbols, exclude, true).swift)
  }

  const files = new Map<string, string>()
  const referenced = new Set<string>()
  for (const module of frameworks) {
    const { modules } = await table(module)
    files.set(`OneSDK_${module}.swift`, tableFile(module))
    for (const m of modules) referenced.add(m)
  }
  for (const module of [...referenced].sort()) {
    if (frameworks.includes(module) || !known.has(module)) continue
    await types(module)
    files.set(`OneSDK_${module}.types.swift`, typesFile(module))
  }
  return files
}

// writes ios/OneSwiftPackages/OneSDKBindings, which the podfile picks up with
// the app's other local swift pods. an app importing no framework gets no pod.
export async function writeAppSdkPod(root: string, log = console.info) {
  const podDir = join(root, 'ios', 'OneSwiftPackages', SDK_POD)
  rmSync(podDir, { recursive: true, force: true })
  const frameworks = importedFrameworks(root)
  if (!frameworks.length) return []
  const files = await generateAppSdk(frameworks, log)
  mkdirSync(join(podDir, 'Sources'), { recursive: true })
  for (const [name, from] of files) copyFileSync(from, join(podDir, 'Sources', name))
  writeFileSync(join(podDir, `${SDK_POD}.podspec`), `Pod::Spec.new do |s|
  s.name = '${SDK_POD}'
  s.version = '0.0.0'
  s.summary = 'iOS SDK bindings for ${frameworks.join(', ')}'
  s.homepage = 'https://onestack.dev'
  s.license = 'MIT'
  s.author = 'one'
  s.source = { :path => '.' }
  s.swift_version = '5.0'
  s.source_files = 'Sources/*.swift'
  s.dependency 'One'
end
`)
  log(`[one] iOS bindings: ${frameworks.join(', ')} (${files.size} files)`)
  return frameworks
}
