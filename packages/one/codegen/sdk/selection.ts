import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import { VISITOR_KEYS, type Node } from '@babel/types'
import type { AppSdkOptions } from './app'
import type { SDKEntryGroup } from './split-facade'
import { generatorFingerprint } from './fingerprint'

const SKIP = new Set(['node_modules', 'ios', 'android', 'dist', 'build', 'types'])
const SDK_IMPORT = /^one\/ios\/([A-Za-z_][A-Za-z0-9_]*)(?:\/([A-Za-z_$][A-Za-z0-9_$]*))?$/
const SDK_SOURCE = /['"]one\/ios(?:\/|['"])|['"]one\/ios-runtime['"]/
const SDK_SPECIFIER = /['"]one\/ios\/([A-Za-z_][A-Za-z0-9_]*)(?:\/[A-Za-z_$][A-Za-z0-9_$]*)?['"]/g
const ONE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]one['"]/
const SDK_BACKEND = /\brequire\(\s*['"](\.\/[\w.-]+\.sdk)['"]\s*\)/g
const DECLARES_ONE = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies']

const defaultPlatformRoot = () => join(dirname(fileURLToPath(import.meta.url)), '../../src/platform')

// hands each source file of the app, of the dependencies declaring `one`, and,
// when the app uses the root barrel, of One's unified native modules to `scan`.
// a dependency that does not declare `one` cannot import one/ios, so only its
// manifest is read to reach its own dependencies.
function scanProject(root: string, platformRoot: string, scan: (file: string, source: string) => void) {
  let usesOne = false
  const read = (file: string, unified: boolean) => {
    const source = readFileSync(file, 'utf8')
    if (!unified && ONE_IMPORT.test(source)) usesOne = true
    scan(file, source)
    if (unified) for (const match of source.matchAll(SDK_BACKEND)) read(join(dirname(file), `${match[1]}.ts`), true)
  }
  const walk = (dir: string, unified = false, dependency = false) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || (SKIP.has(entry.name) && !(dependency && ['dist', 'build'].includes(entry.name)))) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, unified, dependency)
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && (!unified || /\.ios\.[jt]sx?$/.test(entry.name))) read(full, unified)
    }
  }
  walk(root)
  const visited = new Set<string>([realpathSync(root)])
  // the package directory node resolves `name` to from `directory`
  const locate = (directory: string, name: string) => {
    for (let at = directory; ; at = dirname(at)) {
      const packageFile = join(at, 'node_modules', name, 'package.json')
      if (existsSync(packageFile)) return realpathSync(dirname(packageFile))
      if (dirname(at) === at) return undefined
    }
  }
  const dependencies = (directory: string, manifest: Record<string, Record<string, string> | undefined>) => {
    for (const name of new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {})])) {
      if (name === 'one') continue
      const parent = locate(directory, name)
      if (!parent || visited.has(parent)) continue
      visited.add(parent)
      const declared = JSON.parse(readFileSync(join(parent, 'package.json'), 'utf8'))
      if (DECLARES_ONE.some((field) => declared[field]?.one !== undefined)) walk(parent, false, true)
      dependencies(parent, declared)
    }
  }
  if (existsSync(join(root, 'package.json'))) dependencies(root, JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')))
  if (usesOne) walk(platformRoot, true)
}

// every prebuild asks for the frameworks, so this reads text rather than parsing
export function importedFrameworks(root: string, platformRoot = defaultPlatformRoot()): string[] {
  const found = new Set<string>()
  scanProject(root, platformRoot, (_file, source) => {
    for (const match of source.matchAll(SDK_SPECIFIER)) found.add(match[1])
  })
  return [...found].sort()
}

const isTypeScript = (file: string) => /\.[cm]?ts$/.test(file)
const isTsx = (file: string) => file.endsWith('.tsx')

export function importedBindings(root: string, platformRoot = defaultPlatformRoot()) {
  const found = new Map<string, Set<string> | null>()
  let dynamicEntries = false
  const add = (source: string) => {
    const match = SDK_IMPORT.exec(source)
    if (!match) return
    const [, framework, symbol] = match
    if (found.get(framework) === null) return
    // a framework root imports its barrel, registering every wrapper a returned
    // handle may take, so any import of it keeps the full table
    if (!symbol) return void found.set(framework, null)
    found.set(framework, (found.get(framework) ?? new Set<string>()).add(symbol))
  }
  const name = (node: { type: string; name?: string; value?: string }) => (node.type === 'Identifier' ? node.name! : node.value!)
  scanProject(root, platformRoot, (file, source) => {
    if (!SDK_SOURCE.test(source)) return
    let ast: ReturnType<typeof parse>
    try {
      // an angle-bracket assertion is not jsx in .ts, and flow annotations are not typescript in .js
      ast = parse(source, { sourceType: 'unambiguous', plugins: isTypeScript(file) ? ['typescript'] : isTsx(file) ? ['typescript', 'jsx'] : ['jsx', 'flow'] })
    } catch {
      // a file that does not parse may use anything, so every framework it names keeps its full table
      for (const match of source.matchAll(SDK_SPECIFIER)) found.set(match[1], null)
      if (/['"]one\/ios-runtime['"]/.test(source)) dynamicEntries = true
      return
    }
    const visit = (node: Node) => {
      if (node.type === 'ImportDeclaration') {
        if (node.source.value === 'one/ios-runtime' && node.importKind !== 'type' && node.specifiers.some((specifier) => specifier.type !== 'ImportSpecifier' || ['callSDK', 'callSDKAsync'].includes(name(specifier.imported)))) dynamicEntries = true
        // type-only imports are erased, so they reach no entries
        const values = node.specifiers.filter((specifier) => specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type')
        if (node.importKind === 'type' || (node.specifiers.length && !values.length)) return
        add(node.source.value)
      } else if (node.type === 'ExportNamedDeclaration' && node.source) {
        if (node.exportKind === 'type' || (node.specifiers.length && node.specifiers.every((specifier) => specifier.type === 'ExportSpecifier' && specifier.exportKind === 'type'))) return
        add(node.source.value)
      } else if (node.type === 'ExportAllDeclaration') {
        if (node.exportKind !== 'type') add(node.source.value)
      } else if (node.type === 'CallExpression' && ((node.callee.type === 'Identifier' && node.callee.name === 'require') || node.callee.type === 'Import')) {
        const source = node.arguments[0]
        if (source?.type === 'StringLiteral') {
          if (source.value === 'one/ios-runtime') dynamicEntries = true
          add(source.value)
        }
      }
      for (const key of VISITOR_KEYS[node.type] ?? []) {
        const child = Reflect.get(node, key)
        if (Array.isArray(child)) { for (const item of child) if (item) visit(item) }
        else if (child) visit(child)
      }
    }
    visit(ast)
  })
  if (dynamicEntries) for (const framework of found.keys()) found.set(framework, null)
  return found
}

export function appSdkOptions(root: string): AppSdkOptions {
  const metadata: { generation: string; frameworks: Record<string, Record<string, SDKEntryGroup>> } = JSON.parse(readFileSync(new URL('../../dist/sdk/entries.json', import.meta.url), 'utf8'))
  if (metadata.generation !== generatorFingerprint().slice(0, 16)) throw new Error('[one] SDK facade selection does not match the generator')
  const entries: Record<string, number[]> = {}
  for (const [framework, symbols] of importedBindings(root)) {
    if (symbols === null) continue
    const groups = metadata.frameworks[framework]
    if (!groups) throw new Error(`[one] SDK facade groups missing for ${framework}`)
    const pending = [...symbols, ...('_protocols' in groups ? ['_protocols'] : [])]
    const visited = new Set<string>()
    const ids = new Set<number>()
    for (let at = 0; at < pending.length; at++) {
      const name = pending[at]
      if (visited.has(name)) continue
      visited.add(name)
      // interfaces and type aliases are erased, so they have no group
      const group = groups[name]
      if (!group) continue
      for (const id of group.entries) ids.add(id)
      pending.push(...group.dependencies)
    }
    entries[framework] = [...ids].sort((a, b) => a - b)
  }
  return { entries }
}
