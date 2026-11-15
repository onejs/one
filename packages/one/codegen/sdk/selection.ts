import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import { VISITOR_KEYS, type Node } from '@babel/types'
import type { AppSdkOptions } from './app'
import type { SDKEntryGroup } from './split-facade'
import { generatorFingerprint } from './fingerprint'

const SKIP = new Set(['node_modules', 'ios', 'android', 'dist', 'build', 'types'])
const SDK_IMPORT = /^one\/ios\/([A-Za-z_][A-Za-z0-9_]*)(?:\/([A-Za-z_$][A-Za-z0-9_$]*))?$/
const ONE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]one['"]/
const SDK_BACKEND = /\brequire\(\s*['"](\.\/[\w.-]+\.sdk)['"]\s*\)/g

export function importedBindings(root: string, platformRoot = join(dirname(fileURLToPath(import.meta.url)), '../../src/platform')) {
  const found = new Map<string, Set<string> | null>()
  let usesOne = false
  let dynamicEntries = false
  const add = (source: string, symbols?: string[]) => {
    const match = SDK_IMPORT.exec(source)
    if (!match) return
    const [, framework, symbol] = match
    if (found.get(framework) === null) return
    if (!symbol && !symbols?.length) {
      found.set(framework, null)
      return
    }
    const selected = found.get(framework) ?? new Set<string>()
    for (const name of symbol ? [symbol] : symbols ?? []) selected.add(name)
    found.set(framework, selected)
  }
  const scan = (file: string, unified: boolean) => {
    const source = readFileSync(file, 'utf8')
    if (!unified && ONE_IMPORT.test(source)) usesOne = true
    if (source.includes('one/ios')) {
      const ast = parse(source, { sourceType: 'unambiguous', plugins: ['typescript', 'jsx'] })
      const visit = (node: Node) => {
        if (node.type === 'ImportDeclaration') {
          if (node.source.value === 'one/ios-runtime' && node.specifiers.some((specifier) => specifier.type !== 'ImportSpecifier' || ['callSDK', 'callSDKAsync'].includes(specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value))) dynamicEntries = true
          const named = node.specifiers.every((specifier) => specifier.type === 'ImportSpecifier')
          add(node.source.value, named ? node.specifiers.flatMap((specifier) => specifier.type === 'ImportSpecifier' ? [specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value] : []) : undefined)
        } else if (node.type === 'ExportNamedDeclaration' && node.source) {
          add(node.source.value, node.specifiers.flatMap((specifier) => specifier.type === 'ExportSpecifier' ? [specifier.local.name] : []))
        } else if (node.type === 'ExportAllDeclaration') add(node.source.value)
        else if (node.type === 'CallExpression' && ((node.callee.type === 'Identifier' && node.callee.name === 'require') || node.callee.type === 'Import')) {
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
    }
    if (unified) for (const match of source.matchAll(SDK_BACKEND)) scan(join(dirname(file), `${match[1]}.ts`), true)
  }
  const walk = (dir: string, unified = false, dependency = false) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || (SKIP.has(entry.name) && !(dependency && ['dist', 'build'].includes(entry.name)))) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, unified, dependency)
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && (!unified || /\.ios\.[jt]sx?$/.test(entry.name))) scan(full, unified)
    }
  }
  walk(root)
  const visited = new Set<string>([realpathSync(root)])
  const dependencies = (directory: string) => {
    const packageFile = join(directory, 'package.json')
    if (!existsSync(packageFile)) return
    const manifest: { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> } = JSON.parse(readFileSync(packageFile, 'utf8'))
    const require = createRequire(packageFile)
    for (const name of new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {})])) {
      if (name === 'one') continue
      let resolved: string
      try {
        resolved = require.resolve(name + '/package.json')
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error)) throw error
        if (error.code === 'MODULE_NOT_FOUND') continue
        if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error
        try { resolved = require.resolve(name) }
        catch (error) {
          if (error instanceof Error && 'code' in error && (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED')) continue
          throw error
        }
      }
      let parent = dirname(realpathSync(resolved))
      while (!existsSync(join(parent, 'package.json')) || typeof JSON.parse(readFileSync(join(parent, 'package.json'), 'utf8')).name !== 'string') {
        const next = dirname(parent)
        if (next === parent) throw new Error('[one] dependency has no package manifest: ' + name)
        parent = next
      }
      if (visited.has(parent)) continue
      visited.add(parent)
      walk(parent, false, true)
      dependencies(parent)
    }
  }
  dependencies(root)
  if (usesOne) walk(platformRoot, true)
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
      const group = groups[name]
      if (!group) throw new Error(`[one] unknown ${framework} SDK binding: ${name}`)
      for (const id of group.entries) ids.add(id)
      pending.push(...group.dependencies)
    }
    entries[framework] = [...ids].sort((a, b) => a - b)
  }
  return { entries }
}
