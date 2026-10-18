// generates the sdk bindings one app uses. an app reaches a framework by
// importing `one/ios/<Framework>`; prebuild writes one pod holding the table of
// each imported framework, plus the conformances of every framework whose
// enums, option sets and constants those tables pass, so binary size follows
// the imports. it writes each imported framework's typescript facade beside
// the app's packages, where both bundlers resolve `one/ios/<Framework>`, so
// the javascript and the native tables always come from one prebuild. output
// is cached per sdk and generator, so a second prebuild only copies files.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emitModule, typeUsrs, type Entry, type ModuleOutput } from './emit'
import { emitFacade } from './emit-ts'
import { CXX_INTEROP, generateModule, prepare, RUNTIME } from './generate'
import { extractGraphs, loadGraph, sdkModules, sdkVersion } from './graph'
import { IOS_FACADES } from '../../src/utils/iosSdkFacade'
import { minimumVersion } from '../../schema.json'

export const SDK_POD = 'OneSDKBindings'

const SKIP = new Set(['node_modules', 'ios', 'android', 'dist', 'build', 'types'])
const SOURCE = /\.(?:[cm]?[jt]sx?)$/
const IMPORT = /['"]one\/ios\/([A-Za-z_][A-Za-z0-9_]*)['"]/g
const ONE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]one['"]/

// the native root barrel loads the unified modules together. their ios
// implementations contribute framework imports too, even when an app never
// names one/ios itself. derive these dependencies from the shipped sources
// rather than maintaining a second list beside the implementations.
export function importedFrameworks(
  root: string,
  platformRoot = join(dirname(fileURLToPath(import.meta.url)), '../../src/platform')
): string[] {
  const found = new Set<string>()
  let usesOne = false
  const walk = (dir: string, unified = false) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, unified)
      else if (SOURCE.test(entry.name) && (!unified || /\.ios\.[jt]sx?$/.test(entry.name))) {
        const source = readFileSync(full, 'utf8')
        for (const match of source.matchAll(IMPORT)) found.add(match[1])
        if (!unified && ONE_IMPORT.test(source)) usesOne = true
      }
    }
  }
  walk(root)
  if (usesOne) walk(platformRoot, true)
  return [...found].sort()
}

// the generator's own source and the runtime it compiles against key the
// cache, so a changed generator never reuses old tables. the key is also the
// generation the tables and facades carry.
function cacheDir() {
  const here = dirname(fileURLToPath(import.meta.url))
  const hash = createHash('sha256')
  for (const file of readdirSync(here).filter((f) => /\.(?:ts|mjs)$/.test(f)).sort()) hash.update(readFileSync(join(here, file)))
  hash.update(readFileSync(RUNTIME))
  const generation = hash.digest('hex').slice(0, 12)
  const dir = join(homedir(), '.cache', 'one', 'sdk-bindings', `${sdkVersion()}-${generation}`)
  mkdirSync(dir, { recursive: true })
  return { dir, generation }
}

// `modules` names the frameworks declaring the types the entries pass
type Cached = { entries: Omit<Entry, 'swift'>[]; skipped: ModuleOutput['skipped']; modules: string[] }

function entryUsrs(entry: Omit<Entry, 'swift'>) {
  const types = [...entry.params.map((p) => p.type), ...(entry.returns ? [entry.returns] : []),
    ...Object.values(entry.specialization ?? {}), ...(entry.receiver ? [entry.receiver] : [])]
  return types.flatMap((type) => typeUsrs(type))
}

// one generation per framework writes its swift table, its typescript facade
// and a manifest. the facade calls the table by entry id, so both always come
// from the same generation. a process shares one cache, so frameworks loaded
// together share the sdk index and each generates once.
let current: ReturnType<typeof openCache> | undefined
const sdkCache = () => (current ??= openCache())

function openCache() {
  const known = new Set(sdkModules())
  const { dir: cache, generation } = cacheDir()
  // the name the runtime finds a framework's table by, so a facade from one
  // generation fails loudly against an app built from another
  const tableName = (module: string) => `${module}_${generation}`
  const tableFile = (module: string) => join(cache, `OneSDK_${module}.swift`)
  const typesFile = (module: string) => join(cache, `OneSDK_${module}.types.swift`)
  const facadeFile = (module: string) => join(cache, `${module}.ts`)
  const manifest = (module: string) => join(cache, `OneSDK_${module}.json`)

  let prepared: Promise<ReturnType<typeof prepare>> | undefined
  const ready = () =>
    (prepared ??= extractGraphs([...known]).then(() => prepare()))

  const generate = async (module: string, log: (message: string) => void): Promise<Cached> => {
    if (!known.has(module)) {
      throw new Error(`[one] one/ios/${module} names no framework in the iOS ${sdkVersion()} SDK`)
    }
    if (!existsSync(manifest(module))) {
      log(`[one] generating iOS bindings for ${module}`)
      const result = await generateModule(module, await ready(), cache, { table: tableName(module) })
      if (!result) throw new Error(`[one] no symbol graph for ${module}`)
      if (result.errors.length) throw new Error(`[one] ${module} bindings do not compile:\n${result.errors.join('\n')}`)
      const { entries, skipped } = result.output
      const { bridge } = await ready()
      const modules = new Set(entries.flatMap((entry) => entryUsrs(entry).map((usr) => bridge.index.get(usr)?.module ?? '')))
      modules.delete('')
      modules.delete(module)
      const cached: Cached = { entries: entries.map(({ swift, ...e }) => e), skipped, modules: [...modules].sort() }
      writeFileSync(facadeFile(module), emitFacade({ module, table: tableName(module), entries: cached.entries, skipped }, bridge))
      writeFileSync(manifest(module), JSON.stringify(cached))
    }
    return JSON.parse(readFileSync(manifest(module), 'utf8'))
  }
  const tables = new Map<string, Promise<Cached>>()
  const table = (module: string, log: (message: string) => void) => {
    if (!tables.has(module)) tables.set(module, generate(module, log))
    return tables.get(module)!
  }

  // a framework the tables only pass values of contributes its conformances,
  // less those the compiler rejected for its table
  const types = async (module: string, log: (message: string) => void) => {
    if (existsSync(typesFile(module))) return
    const { skipped } = await table(module, log)
    const { bridge, symbols } = await ready()
    const exclude = new Map(skipped.filter((s) => s.reason.startsWith('compile:')).map((s) => [s.usr, s.reason]))
    writeFileSync(typesFile(module), emitModule(loadGraph(module)!, bridge, symbols, exclude, { conformancesOnly: true, table: tableName(module) }).swift)
  }
  return { known, table, types, tableFile, typesFile, facadeFile }
}

// generates (or reuses) the tables and conformances an app needs and returns
// the swift files to compile, keyed by file name
export async function generateAppSdk(frameworks: string[], log = console.info) {
  const { known, table, types, tableFile, typesFile, facadeFile } = sdkCache()
  const files = new Map<string, string>()
  const facades = new Map<string, string>()
  const referenced = new Set<string>()
  for (const module of frameworks) {
    const { modules } = await table(module, log)
    files.set(`OneSDK_${module}.swift`, tableFile(module))
    facades.set(`${module}.ts`, facadeFile(module))
    for (const m of modules) referenced.add(m)
  }
  for (const module of [...referenced].sort()) {
    if (frameworks.includes(module) || !known.has(module)) continue
    await types(module, log)
    files.set(`OneSDK_${module}.types.swift`, typesFile(module))
  }
  return { files, facades }
}

// writes ios/OneSwiftPackages/OneSDKBindings, which the podfile picks up with
// the app's other local swift pods. an app importing no framework gets no pod.
export async function writeAppSdkPod(root: string, log = console.info) {
  const podDir = join(root, 'ios', 'OneSwiftPackages', SDK_POD)
  const facadeDir = join(root, IOS_FACADES)
  rmSync(podDir, { recursive: true, force: true })
  rmSync(facadeDir, { recursive: true, force: true })
  const frameworks = importedFrameworks(root)
  if (!frameworks.length) return []
  const { files, facades } = await generateAppSdk(frameworks, log)
  mkdirSync(join(podDir, 'Sources'), { recursive: true })
  for (const [name, from] of files) copyFileSync(from, join(podDir, 'Sources', name))
  mkdirSync(facadeDir, { recursive: true })
  for (const [name, from] of facades) copyFileSync(from, join(facadeDir, name))
  writeFileSync(join(podDir, `${SDK_POD}.podspec`), `Pod::Spec.new do |s|
  s.name = '${SDK_POD}'
  s.version = '0.0.0'
  s.summary = 'iOS SDK bindings for ${frameworks.join(', ')}'
  s.homepage = 'https://onestack.dev'
  s.license = 'MIT'
  s.author = 'one'
  s.source = { :path => '.' }
  s.platform = :ios, '${minimumVersion}.0'
  s.swift_version = '5.0'
  s.source_files = 'Sources/*.swift'
  s.dependency 'One'
  s.pod_target_xcconfig = { 'OTHER_SWIFT_FLAGS' => '$(inherited) ${CXX_INTEROP.join(' ')}' }
end
`)
  log(`[one] iOS bindings: ${frameworks.join(', ')} (${files.size} files)`)
  return frameworks
}
