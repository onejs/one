/**
 * Finds the Standard Schemas that components pass to `useSearchParams(schema)`.
 *
 * Nothing here runs app code or looks inside a schema. Each module is parsed as text,
 * the `useSearchParams` calls are located, and the schema argument is traced to the
 * exported name it comes from. The generated route types then refer to it with
 * `typeof import(file)[name]` and TypeScript works out the shape.
 */

import { readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseSync } from 'oxc-parser'

/** `module` is an absolute file, or a package specifier TypeScript resolves itself. */
export type SearchSchemaRef = { module: string; isFile: boolean; name: string }

type SearchSchemaUse =
  | { kind: 'local'; name: string; line: number }
  | { kind: 'import'; source: string; name: string; line: number }
  | { kind: 'unassociated'; line: number }

type ModuleInfo = {
  /** specifiers followed to find more components */
  imports: string[]
  uses: SearchSchemaUse[]
  /** local names that are exported, with the exported name */
  exportedLocals: Map<string, string>
}

export type SearchSchemaScan = {
  schemas: SearchSchemaRef[]
  /** every file read, so a change to any of them can regenerate the types */
  files: Set<string>
  unassociated: { file: string; line: number }[]
}

const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs']

const moduleCache = new Map<string, { stamp: string; info: ModuleInfo }>()

type Node = { type: string; [key: string]: any }

function lineOf(code: string, offset: number) {
  let line = 1
  for (let i = 0; i < offset; i++) if (code.charCodeAt(i) === 10) line++
  return line
}

function readModule(file: string): ModuleInfo | undefined {
  let stat
  try {
    stat = statSync(file)
  } catch {
    return undefined
  }
  // generated routes have a context key but no file
  if (!stat.isFile()) return undefined
  const stamp = `${stat.mtimeMs}:${stat.size}`
  const cached = moduleCache.get(file)
  if (cached?.stamp === stamp) return cached.info

  const code = readFileSync(file, 'utf8')
  const info = analyzeModule(file, code)
  moduleCache.set(file, { stamp, info })
  return info
}

function analyzeModule(file: string, code: string): ModuleInfo {
  const info: ModuleInfo = { imports: [], uses: [], exportedLocals: new Map() }
  // a module that cannot call the hook has nothing to find, only imports to follow
  const result = parseSync(file, code)
  if (result.errors.length) return info

  // local name -> where it was imported from
  const importedNames = new Map<string, { source: string; name: string }>()
  const namespaces = new Map<string, string>()
  const hookNames = new Set<string>()
  const oneNamespaces = new Set<string>()
  const topLevelNames = new Set<string>()

  for (const node of result.program.body as Node[]) {
    switch (node.type) {
      case 'ImportDeclaration': {
        const source = node.source.value as string
        if (node.importKind === 'type') break
        if (source === 'one') {
          for (const spec of node.specifiers) {
            if (spec.type === 'ImportSpecifier' && spec.imported.name === 'useSearchParams')
              hookNames.add(spec.local.name)
            if (spec.type === 'ImportNamespaceSpecifier') oneNamespaces.add(spec.local.name)
          }
          break
        }
        info.imports.push(source)
        for (const spec of node.specifiers) {
          if (spec.importKind === 'type') continue
          if (spec.type === 'ImportNamespaceSpecifier') {
            namespaces.set(spec.local.name, source)
          } else {
            importedNames.set(spec.local.name, {
              source,
              name:
                spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported.name,
            })
          }
        }
        break
      }
      case 'ExportAllDeclaration':
        if (node.exportKind !== 'type') info.imports.push(node.source.value)
        break
      case 'ExportNamedDeclaration': {
        if (node.exportKind === 'type') break
        if (node.source) info.imports.push(node.source.value)
        for (const spec of node.specifiers) {
          if (!node.source) info.exportedLocals.set(spec.local.name, spec.exported.name)
        }
        for (const declarator of node.declaration?.declarations ?? []) {
          if (declarator.id.type === 'Identifier') {
            info.exportedLocals.set(declarator.id.name, declarator.id.name)
            topLevelNames.add(declarator.id.name)
          }
        }
        break
      }
      case 'VariableDeclaration':
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier') topLevelNames.add(declarator.id.name)
        }
        break
    }
  }

  if (!hookNames.size && !oneNamespaces.size) return info

  const isHook = (callee: Node) =>
    (callee.type === 'Identifier' && hookNames.has(callee.name)) ||
    (callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.object.type === 'Identifier' &&
      oneNamespaces.has(callee.object.name) &&
      callee.property.name === 'useSearchParams')

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    const current = node as Node
    if (current.type === 'CallExpression' && isHook(current.callee)) {
      const use = traceSchemaArgument(current.arguments[0])
      if (use) info.uses.push(use)
    }
    for (const key in current) {
      if (key !== 'type' && key !== 'start' && key !== 'end') visit(current[key])
    }
  }

  const traceSchemaArgument = (arg: Node | undefined): SearchSchemaUse | undefined => {
    // no argument or the options object is the plain URLSearchParams form
    if (!arg || arg.type === 'ObjectExpression') return undefined
    const line = lineOf(code, arg.start)
    if (arg.type === 'Identifier') {
      const imported = importedNames.get(arg.name)
      if (imported) return { kind: 'import', ...imported, line }
      if (topLevelNames.has(arg.name)) return { kind: 'local', name: arg.name, line }
    }
    if (
      arg.type === 'MemberExpression' &&
      !arg.computed &&
      arg.object.type === 'Identifier' &&
      namespaces.has(arg.object.name)
    ) {
      return {
        kind: 'import',
        source: namespaces.get(arg.object.name)!,
        name: arg.property.name,
        line,
      }
    }
    return { kind: 'unassociated', line }
  }

  visit(result.program)
  return info
}

type PathMapping = { baseUrl: string; paths: [string, string[]][] }

function readJsonc(file: string): any {
  try {
    const text = readFileSync(file, 'utf8')
      .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, str) => str ?? '')
      .replace(/,(\s*[}\]])/g, '$1')
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function readPathMapping(root: string): PathMapping | undefined {
  const visit = (file: string, depth: number): PathMapping | undefined => {
    const config = readJsonc(file)
    if (!config || depth > 4) return undefined
    const options = config.compilerOptions ?? {}
    const inherited =
      typeof config.extends === 'string' && config.extends.startsWith('.')
        ? visit(
            resolve(
              dirname(file),
              config.extends.endsWith('.json') ? config.extends : `${config.extends}.json`
            ),
            depth + 1
          )
        : undefined
    const baseUrl = options.baseUrl ? resolve(dirname(file), options.baseUrl) : undefined
    if (options.paths) {
      return {
        baseUrl: baseUrl ?? inherited?.baseUrl ?? dirname(file),
        paths: Object.entries(options.paths) as [string, string[]][],
      }
    }
    return inherited && baseUrl ? { ...inherited, baseUrl } : inherited
  }
  return visit(join(root, 'tsconfig.json'), 0)
}

function resolveFile(base: string): string | undefined {
  const candidates = [
    base,
    ...extensions.map((ext) => base + ext),
    ...extensions.map((ext) => join(base, `index${ext}`)),
    // typescript ESM style: './file.js' means './file.ts'
    ...(/\.[cm]?js$/.test(base)
      ? extensions.map((ext) => base.replace(/\.[cm]?js$/, ext))
      : []),
  ]
  return candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile()
    } catch {
      return false
    }
  })
}

function createResolver(root: string) {
  const mapping = readPathMapping(root)
  return (specifier: string, from: string): string | undefined => {
    if (specifier.startsWith('.')) return resolveFile(resolve(dirname(from), specifier))
    if (!mapping) return undefined
    for (const [pattern, targets] of mapping.paths) {
      const star = pattern.indexOf('*')
      const matched =
        star === -1
          ? specifier === pattern
            ? ''
            : undefined
          : specifier.startsWith(pattern.slice(0, star)) &&
              specifier.endsWith(pattern.slice(star + 1))
            ? specifier.slice(star, specifier.length - (pattern.length - star - 1))
            : undefined
      if (matched === undefined) continue
      for (const target of targets) {
        const file = resolveFile(resolve(mapping.baseUrl, target.replace('*', matched)))
        if (file) return file
      }
    }
    return undefined
  }
}

/**
 * Scans a set of entry files (a route and its layouts) and everything they import
 * through relative or tsconfig-path specifiers. Packages are not followed.
 */
export function createSearchSchemaScanner(root: string) {
  const resolveUncached = createResolver(root)
  // layouts are shared by many routes, so each file is read and resolved once per scanner
  const infos = new Map<string, ModuleInfo | undefined>()
  const resolved = new Map<string, string | undefined>()

  const resolveSpecifier = (specifier: string, from: string) => {
    const key = `${from}\0${specifier}`
    if (!resolved.has(key)) resolved.set(key, resolveUncached(specifier, from))
    return resolved.get(key)
  }

  const getModule = (file: string) => {
    if (!infos.has(file)) infos.set(file, readModule(file))
    return infos.get(file)
  }

  return function scan(entries: string[]): SearchSchemaScan {
    const files = new Set<string>()
    const schemas = new Map<string, SearchSchemaRef>()
    const unassociated: SearchSchemaScan['unassociated'] = []
    const queue = [...entries]

    while (queue.length) {
      const file = queue.pop()!
      if (files.has(file)) continue
      files.add(file)
      const info = getModule(file)
      if (!info) continue

      for (const specifier of info.imports) {
        const target = resolveSpecifier(specifier, file)
        if (target) queue.push(target)
      }

      for (const use of info.uses) {
        if (use.kind === 'unassociated') {
          unassociated.push({ file, line: use.line })
        } else if (use.kind === 'local') {
          const name = info.exportedLocals.get(use.name)
          if (name) schemas.set(`${file}\0${name}`, { module: file, isFile: true, name })
          else unassociated.push({ file, line: use.line })
        } else {
          const target = resolveSpecifier(use.source, file)
          if (target) {
            schemas.set(`${target}\0${use.name}`, {
              module: target,
              isFile: true,
              name: use.name,
            })
          } else if (use.source.startsWith('.')) {
            unassociated.push({ file, line: use.line })
          } else {
            schemas.set(`${use.source}\0${use.name}`, {
              module: use.source,
              isFile: false,
              name: use.name,
            })
          }
        }
      }
    }

    const sorted = [...schemas.values()].sort((a, b) =>
      a.module === b.module
        ? a.name < b.name
          ? -1
          : 1
        : a.module < b.module
          ? -1
          : 1
    )
    return { schemas: sorted, files, unassociated }
  }
}
