import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { parseSync } from 'oxc-parser'
import MagicString from 'magic-string'
import remapping from '@jridgewell/remapping'
import { TraceMap, eachMapping } from '@jridgewell/trace-mapping'
import { transformHermesLoops, transformReactNativeCodegen } from '@vxrn/compiler'

// `async function*`, the `async *name()` method shorthand, and `for await (`.
// Hermes rejects all three at parse time with "async generators are unsupported".
// the shorthand arm can also match `async * x` multiplication, which only costs
// that module a lower transform target.
const HERMES_UNSUPPORTED_ASYNC_RE =
  /\basync\s+function\s*\*|\basync\s*\*\s*[\w$[]|\bfor\s+await\s*\(/

/**
 * Module-scope bindings initialized to a literal and never reassigned, so a
 * `require.context` argument held in a variable resolves to its value. Metro
 * evaluates those arguments rather than demanding literals, and one's router
 * entry keeps its route root in exactly such a binding.
 *
 * The declaration kind is deliberately ignored. The Hermes loop-binding pass
 * rewrites every `const` to `var`, so matching on the keyword would stop
 * resolving the router root and drop every route from the bundle. Not being
 * reassigned is the property that actually matters.
 */
function collectModuleLiteralBindings(program: any): Map<string, any> {
  const reassigned = new Set<string>()
  const declCount = new Map<string, number>()

  ;(function findReassignments(node: any) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const child of node) findReassignments(child)
      return
    }
    if (node.type === 'AssignmentExpression' && node.left?.type === 'Identifier') {
      reassigned.add(node.left.name)
    } else if (node.type === 'UpdateExpression' && node.argument?.type === 'Identifier') {
      reassigned.add(node.argument.name)
    }
    for (const key in node) {
      if (key === 'type' || key === 'start' || key === 'end') continue
      findReassignments(node[key])
    }
  })(program)

  for (const stmt of program.body || []) {
    if (stmt.type !== 'VariableDeclaration') continue
    for (const decl of stmt.declarations || []) {
      if (decl.id?.type === 'Identifier') {
        declCount.set(decl.id.name, (declCount.get(decl.id.name) || 0) + 1)
      }
    }
  }

  const bindings = new Map<string, any>()
  for (const stmt of program.body || []) {
    if (stmt.type !== 'VariableDeclaration') continue
    for (const decl of stmt.declarations || []) {
      if (
        decl.id?.type === 'Identifier' &&
        decl.init?.type === 'Literal' &&
        !reassigned.has(decl.id.name) &&
        declCount.get(decl.id.name) === 1
      ) {
        bindings.set(decl.id.name, decl.init)
      }
    }
  }
  return bindings
}

export type MetroContextParams = {
  recursive: boolean
  filter: { pattern: string; flags: string }
  mode: 'sync' | 'eager' | 'lazy' | 'lazy-once'
}

export type MetroDependencyData = {
  key?: string
  asyncType?: 'async' | 'weak' | 'maybeSync' | null
  contextParams?: MetroContextParams
  locs: Array<{ start: { line: number; column: number }; end: { line: number; column: number } }>
  isOptional?: boolean
  isESMImportAtSource?: boolean
  isESMImport?: boolean
  index?: number
}

export type MetroDependency = {
  name: string
  data: MetroDependencyData
}

export type MetroOutputData = {
  code: string
  lineCount: number
  map: any[]
  functionMap?: any
}

export type MetroOutput = {
  data: MetroOutputData
  type: 'js/module' | 'js/script' | 'js/module/asset'
}

export type MetroWorkerResult = {
  dependencies: MetroDependency[]
  output: MetroOutput[]
}

export type MetroWorkerConfig = {
  assetRegistryPath?: string
  assetPlugins?: string[]
  asyncRequireModulePath?: string
  globalPrefix?: string
  unstable_dependencyMapReservedName?: string
  unstable_disableModuleWrapping?: boolean
  minifierPath?: string
  minifierConfig?: any
  publicPath?: string
  allowOptionalDependencies?: any
  dynamicDepsInPackages?: string
}

export type MetroWorkerOptions = {
  dev?: boolean
  minify?: boolean
  platform?: 'ios' | 'android' | 'web' | string
  type?: 'module' | 'script' | 'asset'
  customTransformOptions?: Record<string, any>
  unstable_transformProfile?: string
  moduleId?: number | string
  dependencyIds?: Array<number | string>
}

export type WrapModuleOptions = {
  globalPrefix?: string
  moduleId?: number | string
  dependencyIds?: Array<number | string>
  dependencyMapName?: string
  requireAlias?: boolean
}

const WORKER_CACHE_KEY_VERSION = '2'

const FLOW_FILE_PATTERN = /node_modules[\\/](?:react-native|@react-native)[\\/].*\.js$/

/**
 * react-native ships jsx inside plain .js files, and oxc disables jsx for .js
 * unless told otherwise. parsing those as 'js' fails on the first JSX element,
 * so every non-typescript file is parsed as jsx.
 */
function langForFilename(filename: string): 'ts' | 'tsx' | 'jsx' {
  if (filename.endsWith('.tsx')) return 'tsx'
  if (filename.endsWith('.ts')) return 'ts'
  return 'jsx'
}

export type OneRouterMetroOptions = {
  ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY?: string
  ONE_ROUTER_LINKING_CONFIG?: unknown
  ONE_ROUTER_ROOT_FOLDER_NAME?: string
  ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING?: string
  ONE_SETUP_FILE_NATIVE?: string
}

/**
 * one's router options reach the transformer on the same channel the babel
 * transformer reads them from, as the options of its `one-router-metro` plugin
 * entry.
 */
export function getOneRouterMetroOptions(options: MetroWorkerOptions): OneRouterMetroOptions | undefined {
  const plugins = (options.customTransformOptions as any)?.vite?.babelConfig?.plugins
  if (!Array.isArray(plugins)) return undefined
  for (const plugin of plugins) {
    if (Array.isArray(plugin) && typeof plugin[0] === 'string' && plugin[0].includes('one-router-metro')) {
      return plugin[1] as OneRouterMetroOptions
    }
  }
  return undefined
}

/**
 * Reads the alias map one's babel preset hands to `babel-plugin-module-resolver`
 * (its "vite-tsconfig-paths for Metro"). Keys ending in `$` are exact matches,
 * the rest are prefixes.
 */
export function getModuleResolverAliases(
  options: MetroWorkerOptions
): Record<string, string> | undefined {
  const plugins = (options.customTransformOptions as any)?.vite?.babelConfig?.plugins
  if (!Array.isArray(plugins)) return undefined
  for (const plugin of plugins) {
    if (
      Array.isArray(plugin) &&
      typeof plugin[0] === 'string' &&
      plugin[0].includes('module-resolver')
    ) {
      const alias = plugin[1]?.alias
      if (alias && typeof alias === 'object') return alias
    }
  }
  return undefined
}

/**
 * Resolves one tsconfig-path alias to a specifier relative to the importing
 * file. The native worker replaces the babel transformer, so without this every
 * aliased import fails to resolve.
 */
export function resolveAliasSpecifier(
  specifier: string,
  filename: string,
  projectRoot: string,
  aliases: Record<string, string>
): string | undefined {
  for (const [rawKey, value] of Object.entries(aliases)) {
    let target: string | undefined
    if (rawKey.endsWith('$')) {
      if (specifier === rawKey.slice(0, -1)) target = value
    } else if (specifier === rawKey || specifier.startsWith(`${rawKey}/`)) {
      target = value + specifier.slice(rawKey.length)
    }
    if (target === undefined) continue

    const abs = path.resolve(projectRoot, target)
    let rel = path.relative(path.dirname(filename), abs).split(path.sep).join('/')
    if (!rel.startsWith('.')) rel = `./${rel}`
    return rel
  }
  return undefined
}

/**
 * Rewrites aliased import/export/require specifiers in place.
 */
export function applyModuleResolverAliases(
  code: string,
  filename: string,
  projectRoot: string,
  aliases: Record<string, string>
): string {
  const parsed = parseSync(filename, code, { lang: langForFilename(filename) })
  if (parsed?.errors?.length) {
    throw new Error(
      `[vxrn/metro] Failed to parse ${filename} for alias resolution: ${parsed.errors[0].message}`
    )
  }
  if (!parsed?.program) return code

  const ms = new MagicString(code)
  let changed = false

  function rewrite(sourceNode: any) {
    if (sourceNode?.type !== 'Literal' || typeof sourceNode.value !== 'string') return
    const resolved = resolveAliasSpecifier(sourceNode.value, filename, projectRoot, aliases)
    if (resolved === undefined) return
    ms.overwrite(sourceNode.start, sourceNode.end, JSON.stringify(resolved))
    changed = true
  }

  function walk(node: any) {
    if (!node || typeof node !== 'object') return

    if (
      node.type === 'ImportDeclaration' ||
      node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportAllDeclaration' ||
      node.type === 'ImportExpression'
    ) {
      rewrite(node.source)
    } else if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === 'require'
    ) {
      rewrite(node.arguments?.[0])
    }

    for (const k of Object.keys(node)) {
      if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'parent' || k === 'comments') continue
      const child = node[k]
      if (Array.isArray(child)) {
        for (const item of child) walk(item)
      } else if (child && typeof child === 'object') {
        walk(child)
      }
    }
  }

  walk(parsed.program)
  return changed ? ms.toString() : code
}

/**
 * Native port of babel-preset-expo's `expo-inline-or-reference-env-vars`. In
 * production every `process.env.EXPO_PUBLIC_*` read is inlined as a literal; in
 * development each one is routed through the `expo/virtual/env` module so edits
 * to .env take effect without a full rebuild. Without this the reads survive
 * into the bundle and every EXPO_PUBLIC_ value is undefined at runtime.
 */
export function applyExpoInlineEnvVars(
  code: string,
  filename: string,
  isProduction: boolean
): string {
  const parsed = parseSync(filename, code, { lang: langForFilename(filename) })
  if (parsed?.errors?.length) {
    throw new Error(
      `[vxrn/metro] Failed to parse ${filename} for env inlining: ${parsed.errors[0].message}`
    )
  }
  if (!parsed?.program) return code

  const ms = new MagicString(code)
  let needsEnvImport = false

  function keyOf(prop: any, computed: boolean): string | undefined {
    if (!computed && prop?.type === 'Identifier') return prop.name
    if (prop?.type === 'Literal' && typeof prop.value === 'string') return prop.value
    return undefined
  }

  function walk(node: any, parent: any) {
    if (!node || typeof node !== 'object') return

    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      const obj = node.object
      const isProcessEnv =
        (obj?.type === 'MemberExpression' || obj?.type === 'OptionalMemberExpression') &&
        obj.object?.type === 'Identifier' &&
        obj.object.name === 'process' &&
        keyOf(obj.property, obj.computed) === 'env'
      // an assignment target is left alone, matching the babel plugin: rewriting
      // it would produce a write to the virtual module.
      const isAssignmentTarget =
        parent?.type === 'AssignmentExpression' && parent.left === node
      const key = keyOf(node.property, node.computed)

      if (isProcessEnv && !isAssignmentTarget && key?.startsWith('EXPO_PUBLIC_')) {
        if (isProduction) {
          ms.overwrite(node.start, node.end, JSON.stringify(process.env[key] ?? undefined))
        } else {
          ms.overwrite(node.start, node.end, `_$$_EXPO_ENV.${key}`)
          needsEnvImport = true
        }
        return
      }
    }

    for (const k of Object.keys(node)) {
      if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'parent' || k === 'comments') continue
      const child = node[k]
      if (Array.isArray(child)) {
        for (const item of child) walk(item, node)
      } else if (child && typeof child === 'object') {
        walk(child, node)
      }
    }
  }

  walk(parsed.program, null)

  if (needsEnvImport) {
    ms.prepend(`import { env as _$$_EXPO_ENV } from "expo/virtual/env";\n`)
  }
  return ms.hasChanged() ? ms.toString() : code
}

/**
 * Native port of one's `babel-plugin-one-router-metro`. The native worker
 * replaces the babel transformer wholesale, so without this the router entry
 * keeps `process.env.ONE_ROUTER_*` reads that never resolve: `require.context`
 * gets a non-literal regex and metro drops the entire route tree, and the
 * configured setup file is never imported.
 */
export function applyOneRouterMetro(
  code: string,
  filename: string,
  options: OneRouterMetroOptions
): string {
  const isMetroEntry = filename.endsWith('metro-entry.js')
  const isEntryCtx = filename.endsWith('metro-entry-ctx.js')
  if (!isMetroEntry && !isEntryCtx) return code

  const parsed = parseSync(filename, code, { lang: langForFilename(filename) })
  if (parsed?.errors?.length) {
    throw new Error(
      `[vxrn/metro] Failed to parse ${filename} for one-router-metro: ${parsed.errors[0].message}`
    )
  }
  if (!parsed?.program) return code

  const ms = new MagicString(code)
  let lastImportEnd = -1

  function replacementFor(key: string): string | undefined {
    if (key.startsWith('ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY')) {
      return JSON.stringify(options.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY)
    }
    if (key.startsWith('ONE_ROUTER_ROOT_FOLDER_NAME')) {
      return JSON.stringify(options.ONE_ROUTER_ROOT_FOLDER_NAME)
    }
    if (key.startsWith('ONE_ROUTER_REQUIRE_CONTEXT_REGEX')) {
      // must become a real regex literal: metro rejects any other node type as
      // the third argument of require.context.
      return `/${options.ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING}/`
    }
    if (key === 'ONE_ROUTER_LINKING_CONFIG') {
      // gated to the entry so a user module reading this name is left alone
      return isMetroEntry ? JSON.stringify(options.ONE_ROUTER_LINKING_CONFIG ?? null) : undefined
    }
    if (key === 'ONE_SETUP_FILE_NATIVE') {
      return options.ONE_SETUP_FILE_NATIVE
        ? JSON.stringify(options.ONE_SETUP_FILE_NATIVE)
        : 'undefined'
    }
    return undefined
  }

  function walk(node: any, parent: any) {
    if (!node || typeof node !== 'object') return

    if (node.type === 'ImportDeclaration' && parent === parsed.program) {
      lastImportEnd = Math.max(lastImportEnd, node.end)
    }

    if (
      node.type === 'MemberExpression' &&
      node.object?.type === 'MemberExpression' &&
      !node.object.computed &&
      node.object.object?.type === 'Identifier' &&
      node.object.object.name === 'process' &&
      node.object.property?.type === 'Identifier' &&
      node.object.property.name === 'env'
    ) {
      const key = node.computed
        ? node.property?.type === 'Literal' && typeof node.property.value === 'string'
          ? node.property.value
          : undefined
        : node.property?.type === 'Identifier'
          ? node.property.name
          : undefined
      const isAssignTarget =
        parent?.type === 'AssignmentExpression' && parent.left === node
      if (key && !isAssignTarget) {
        const replacement = replacementFor(key)
        if (replacement !== undefined) {
          ms.overwrite(node.start, node.end, replacement)
        }
      }
    }

    for (const k of Object.keys(node)) {
      if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'parent' || k === 'comments') continue
      const child = node[k]
      if (Array.isArray(child)) {
        for (const item of child) walk(item, node)
      } else if (child && typeof child === 'object') {
        walk(child, node)
      }
    }
  }

  walk(parsed.program, parsed.program)

  // the setup file goes after the existing imports so react-native is
  // initialized before it runs, matching the babel plugin's ordering.
  if (isMetroEntry && options.ONE_SETUP_FILE_NATIVE) {
    const stmt = `\nimport ${JSON.stringify(options.ONE_SETUP_FILE_NATIVE)};`
    if (lastImportEnd >= 0) {
      ms.appendRight(lastImportEnd, stmt)
    } else {
      ms.prepend(`${stmt}\n`)
    }
  }

  return ms.toString()
}

/**
 * Recursively collects identifier names from patterns (bindings).
 */
export function collectPatternNames(pattern: any, names: Set<string>) {
  if (!pattern) return
  if (pattern.type === 'Identifier') {
    names.add(pattern.name)
  } else if (pattern.type === 'AssignmentPattern') {
    collectPatternNames(pattern.left, names)
  } else if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties || []) {
      if (prop.type === 'Property') collectPatternNames(prop.value, names)
      else if (prop.type === 'RestElement') collectPatternNames(prop.argument, names)
    }
  } else if (pattern.type === 'ArrayPattern') {
    for (const elem of pattern.elements || []) {
      if (elem) collectPatternNames(elem, names)
    }
  } else if (pattern.type === 'RestElement') {
    collectPatternNames(pattern.argument, names)
  }
}

/**
 * Recursively collects all hoisted `var` declarations and `FunctionDeclaration` names
 * within a function body or program, stopping traversal at nested function boundaries.
 */
export function collectHoistedBindings(node: any, names: Set<string>) {
  function traverse(n: any) {
    if (!n || typeof n !== 'object') return
    if (n === node) {
      // Root of traversal
    } else if (
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      if (n.type === 'FunctionDeclaration' && n.id?.name) {
        names.add(n.id.name)
      }
      return
    }

    if (n.type === 'VariableDeclaration' && n.kind === 'var') {
      for (const decl of n.declarations || []) {
        collectPatternNames(decl.id, names)
      }
    }

    for (const key of Object.keys(n)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range' || key === 'parent' || key === 'comments') continue
      const child = n[key]
      if (Array.isArray(child)) {
        for (const item of child) traverse(item)
      } else if (child && typeof child === 'object') {
        traverse(child)
      }
    }
  }

  traverse(node)
}

/**
 * Collects block-scoped declarations (let, const, class, and block-level function declarations)
 * directly declared in this block (not inside nested blocks).
 */
export function collectBlockBindings(statements: any[], names: Set<string>) {
  if (!Array.isArray(statements)) return
  for (const stmt of statements) {
    if (!stmt) continue
    if (stmt.type === 'VariableDeclaration' && stmt.kind !== 'var') {
      for (const decl of stmt.declarations || []) {
        collectPatternNames(decl.id, names)
      }
    } else if (stmt.type === 'ClassDeclaration' && stmt.id?.name) {
      names.add(stmt.id.name)
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id?.name) {
      names.add(stmt.id.name)
    }
  }
}

/**
 * Lexical scope tracker for identifier shadowing analysis.
 */
export class ScopeTracker {
  private stack: Array<Set<string>> = [new Set()]

  enter(initialBindings?: Iterable<string>) {
    this.stack.push(new Set(initialBindings))
  }

  exit() {
    if (this.stack.length > 1) {
      this.stack.pop()
    }
  }

  add(name: string) {
    this.stack[this.stack.length - 1].add(name)
  }

  currentScope(): Set<string> {
    return this.stack[this.stack.length - 1]
  }

  addPattern(pattern: any) {
    collectPatternNames(pattern, this.currentScope())
  }

  isShadowed(name: string): boolean {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].has(name)) return true
    }
    return false
  }
}

/**
 * Cache key generation without any Babel references.
 */
export function getCacheKey(config: MetroWorkerConfig = {}, opts?: any): string {
  const hash = crypto.createHash('sha256')
  hash.update('metroNativeWorker')
  hash.update(WORKER_CACHE_KEY_VERSION)
  if (config.globalPrefix) {
    hash.update(config.globalPrefix)
  }
  if (config.unstable_dependencyMapReservedName) {
    hash.update(config.unstable_dependencyMapReservedName)
  }
  if (config.minifierPath) {
    hash.update(config.minifierPath)
  }
  if (opts?.projectRoot) {
    hash.update(opts.projectRoot)
  }
  return hash.digest('hex')
}

/**
 * Converts a standard SourceMap V3 object into Metro's raw mapping segment tuples.
 * Metro expects an array of tuples: [line, column] or [line, column, origLine, origCol, name?]
 * Mappings must be strictly sorted by generatedLine ascending, then generatedColumn ascending.
 */
export function convertSourceMapToMetroRawMappings(
  composedMap: any
): Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]> {
  if (!composedMap) return []
  const tracer = new TraceMap(composedMap)
  const rawMappings: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]> = []

  eachMapping(tracer, (m) => {
    if (m.originalLine == null) {
      rawMappings.push([m.generatedLine, m.generatedColumn])
    } else if (m.name == null) {
      rawMappings.push([m.generatedLine, m.generatedColumn, m.originalLine, m.originalColumn])
    } else {
      rawMappings.push([m.generatedLine, m.generatedColumn, m.originalLine, m.originalColumn, m.name])
    }
  })

  // Mappings MUST be strictly sorted by generatedLine ascending, then generatedColumn ascending
  rawMappings.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0]
    return a[1] - b[1]
  })

  // Deduplicate consecutive identical (generatedLine, generatedColumn) tuples
  const deduped: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]> = []
  for (const mapping of rawMappings) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev[0] === mapping[0] && prev[1] === mapping[1]) {
      continue
    }
    deduped.push(mapping)
  }

  return deduped
}

/**
 * Counts lines and ensures map terminates per Metro contract.
 */
export function countLinesAndTerminateMap(
  code: string,
  map: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]> = []
): { lineCount: number; map: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]> } {
  const NEWLINE = /\r\n?|\n|\u2028|\u2029/g
  let lineCount = 1
  let lastLineStart = 0
  for (const match of code.matchAll(NEWLINE)) {
    lineCount++
    lastLineStart = match.index! + match[0].length
  }
  const lastLineLength = code.length - lastLineStart
  const lastLineIndex1Based = lineCount
  const lastLineNextColumn0Based = lastLineLength
  const lastMapping = map[map.length - 1]
  const terminatingMapping: [number, number] = [lastLineIndex1Based, lastLineNextColumn0Based]
  if (
    !lastMapping ||
    lastMapping[0] !== terminatingMapping[0] ||
    lastMapping[1] !== terminatingMapping[1]
  ) {
    return {
      lineCount,
      map: map.concat([terminatingMapping]),
    }
  }
  return {
    lineCount,
    map: [...map],
  }
}

/**
 * Wraps JSON in CommonJS via module.exports and Metro's module wrapper.
 */
export function wrapJson(
  source: string,
  options?: {
    globalPrefix?: string
    moduleId?: number | string
    dependencyIds?: Array<number | string>
  }
): string {
  const globalPrefix = options?.globalPrefix || ''
  const factory = [
    'function (global, require, _importDefaultUnused, _importAllUnused, module, exports, _dependencyMapUnused) {',
    `  module.exports = ${source};`,
    '}',
  ].join('\n')

  if (options?.moduleId !== undefined) {
    const depIds = options.dependencyIds ? JSON.stringify(options.dependencyIds) : '[]'
    return `${globalPrefix}__d(${factory}, ${JSON.stringify(options.moduleId)}, ${depIds});`
  }

  return `${globalPrefix}__d(${factory});`
}

/**
 * Wraps CommonJS code in Metro's standard define wrapper:
 * __d(function (global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) { ... }, moduleId, [dependencyIds])
 */
export function wrapModule(
  code: string,
  options?: WrapModuleOptions
): string {
  const globalPrefix = options?.globalPrefix || ''
  const depMap = options?.dependencyMapName || '_dependencyMap'
  const header = `function (global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, ${depMap}) {`
  const requireAlias = options?.requireAlias !== false ? 'var require = _$$_REQUIRE;\n' : ''
  const footer = `}`

  if (options?.moduleId !== undefined) {
    const depIds = options.dependencyIds ? JSON.stringify(options.dependencyIds) : '[]'
    return `${globalPrefix}__d(${header}\n${requireAlias}${code}\n${footer}, ${JSON.stringify(options.moduleId)}, ${depIds});`
  }

  return `${globalPrefix}__d(${header}\n${requireAlias}${code}\n${footer});`
}

/**
 * Metro canonical dependency qualifier key format.
 */
export function getDependencyKey(
  name: string,
  isESM: boolean,
  asyncType: 'async' | 'weak' | 'maybeSync' | null = null,
  contextParams?: MetroContextParams
): string {
  let key = `${name}\0${isESM ? 'import' : 'require'}`
  if (asyncType != null) {
    key += `\0${asyncType}`
  }
  // mirrors metro's getKeyForDependency so a require.context dependency keys the
  // same way metro's own collectDependencies would key it.
  if (contextParams) {
    key += [
      '',
      'context',
      String(contextParams.recursive),
      String(contextParams.filter.pattern),
      String(contextParams.filter.flags),
      contextParams.mode,
    ].join('\0')
  }
  return key
}

/**
 * Rewrites require("dep") calls to Metro's dependency ABI:
 * require(_dependencyMap[index], "dep")
 * Respects lexical scope shadowing (does NOT rewrite local parameters or variables named require).
 */
export type RewriteDependencyCallsResult = {
  code: string
  map: any
  toString(): string
}

/**
 * Rewrites require("dep") calls and import("dep") expressions to Metro's dependency ABI:
 * require(_dependencyMap[index], "dep")
 * require(_dependencyMap[asyncIndex], "metro-runtime/src/modules/asyncRequire")(_dependencyMap[depIndex], _dependencyMap.paths, "dep")
 * Respects lexical scope shadowing and JS hoisting rules.
 * Returns { code, map, toString() } preserving source maps for the rewrite stage.
 */
export function rewriteDependencyCalls(
  code: string,
  dependencies: MetroDependency[],
  depMapName = '_dependencyMap',
  filename = 'module.js',
  asyncRequirePath = 'metro-runtime/src/modules/asyncRequire'
): RewriteDependencyCallsResult {
  const ms = new MagicString(code)

  const emptyResult: RewriteDependencyCallsResult = {
    code,
    map: ms.generateMap({ source: filename, hires: true, includeContent: true }),
    toString() {
      return code
    },
  }

  if (dependencies.length === 0) return emptyResult

  let parsed: any
  try {
    parsed = parseSync(filename, code, { lang: langForFilename(filename) })
  } catch (err: any) {
    throw new Error(
      `[vxrn/metro] Failed to parse ${filename} for dependency rewriting: ${err.message || err}`
    )
  }

  // a silent bail here leaves raw require("./dep") calls that metro never
  // registered, so the module is absent from the bundle and throws at runtime.
  if (parsed?.errors?.length) {
    throw new Error(
      `[vxrn/metro] Failed to parse ${filename} for dependency rewriting: ${parsed.errors[0].message}`
    )
  }

  if (!parsed?.program) return emptyResult

  const contextLiteralBindings = collectModuleLiteralBindings(parsed.program)

  const scopeTracker = new ScopeTracker()
  collectHoistedBindings(parsed.program, scopeTracker.currentScope())
  collectBlockBindings(parsed.program.body, scopeTracker.currentScope())
  for (const stmt of parsed.program.body || []) {
    if (stmt.type === 'ImportDeclaration') {
      for (const spec of stmt.specifiers || []) {
        if (spec.local?.name) {
          scopeTracker.add(spec.local.name)
        }
      }
    }
  }

  function walk(node: any) {
    if (!node || typeof node !== 'object') return

    let pushedScope = false

    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      scopeTracker.enter()
      pushedScope = true
      for (const param of node.params || []) {
        scopeTracker.addPattern(param)
      }
      if (node.type === 'FunctionExpression' && node.id?.name) {
        scopeTracker.add(node.id.name)
      }
      if (node.body) {
        collectHoistedBindings(node.body, scopeTracker.currentScope())
      }
    } else if (node.type === 'BlockStatement') {
      scopeTracker.enter()
      pushedScope = true
      collectBlockBindings(node.body, scopeTracker.currentScope())
    } else if (node.type === 'CatchClause') {
      scopeTracker.enter()
      pushedScope = true
      if (node.param) {
        scopeTracker.addPattern(node.param)
      }
    } else if (
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement'
    ) {
      const decl = node.type === 'ForStatement' ? node.init : node.left
      if (decl?.type === 'VariableDeclaration' && decl.kind !== 'var') {
        scopeTracker.enter()
        pushedScope = true
        for (const d of decl.declarations || []) {
          scopeTracker.addPattern(d.id)
        }
      }
    }

    if (
      node.type === 'ImportExpression' &&
      node.source?.type === 'Literal' &&
      typeof node.source.value === 'string'
    ) {
      const depName = node.source.value
      const depKey = getDependencyKey(depName, true, 'async')
      const dep =
        dependencies.find((d) => d.data.key === depKey) ||
        dependencies.find((d) => d.name === depName && d.data.asyncType === 'async')

      const asyncKey = getDependencyKey(asyncRequirePath, false, null)
      const asyncDep =
        dependencies.find((d) => d.data.key === asyncKey) ||
        dependencies.find((d) => d.name === asyncRequirePath && d.data.asyncType == null)

      if (dep && asyncDep) {
        const depIndex = dep.data.index ?? dependencies.indexOf(dep)
        const asyncIndex = asyncDep.data.index ?? dependencies.indexOf(asyncDep)
        ms.overwrite(
          node.start,
          node.end,
          `require(${depMapName}[${asyncIndex}], ${JSON.stringify(asyncRequirePath)})(${depMapName}[${depIndex}], ${depMapName}.paths, ${JSON.stringify(depName)})`
        )
      }
    } else if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === 'require' &&
      !scopeTracker.isShadowed('require') &&
      node.arguments?.length >= 1
    ) {
      const arg = node.arguments[0]
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        const depKey = getDependencyKey(arg.value, false, null)
        const dep =
          dependencies.find((d) => d.data.key === depKey) ||
          dependencies.find((d) => d.name === arg.value && d.data.asyncType == null)
        if (dep) {
          const index = dep.data.index ?? dependencies.indexOf(dep)
          ms.overwrite(arg.start, arg.end, `${depMapName}[${index}], ${JSON.stringify(arg.value)}`)
        }
      }
    } else if (
      // metro rewrites require.context(dir, ...) down to a plain require of the
      // single context module it registered for that directory.
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      !node.callee.computed &&
      node.callee.object?.type === 'Identifier' &&
      node.callee.object.name === 'require' &&
      node.callee.property?.type === 'Identifier' &&
      node.callee.property.name === 'context' &&
      !scopeTracker.isShadowed('require') &&
      node.arguments?.length >= 1
    ) {
      // resolved the same way dependency extraction resolved it. matching only
      // a direct Literal here left a variable-held directory registered as a
      // dependency but never rewritten, so the call reached metro's
      // fallbackRequireContext at runtime and threw.
      const arg =
        node.arguments[0]?.type === 'Identifier'
          ? contextLiteralBindings.get(node.arguments[0].name)
          : node.arguments[0]
      if (arg?.type === 'Literal' && typeof arg.value === 'string') {
        const dep = dependencies.find(
          (d) => d.name === arg.value && d.data.contextParams != null
        )
        if (dep) {
          const index = dep.data.index ?? dependencies.indexOf(dep)
          ms.overwrite(
            node.start,
            node.end,
            `require(${depMapName}[${index}], ${JSON.stringify(arg.value)})`
          )
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range' || key === 'parent' || key === 'comments') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) walk(item)
      } else if (child && typeof child === 'object') {
        walk(child)
      }
    }

    if (pushedScope) {
      scopeTracker.exit()
    }
  }

  walk(parsed.program)
  const resultString = ms.toString()
  const map = ms.generateMap({ source: filename, hires: true, includeContent: true })
  return {
    code: resultString,
    map,
    toString() {
      return resultString
    },
  }
}

/**
 * Extracts dependencies using oxc-parser (zero Babel).
 * Respects lexical scope shadowing and JS hoisting rules.
 */
export function extractDependencies(
  code: string,
  filename: string,
  options?: {
    asyncRequireModulePath?: string
    allowOptionalDependencies?: any
  }
): MetroDependency[] {
  const asyncRequirePath =
    options?.asyncRequireModulePath || 'metro-runtime/src/modules/asyncRequire'
  const allowOptionalDependencies = options?.allowOptionalDependencies
  const lineOffsets = [0]
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') {
      lineOffsets.push(i + 1)
    }
  }

  function offsetToLoc(pos: number): { line: number; column: number } {
    let low = 0
    let high = lineOffsets.length - 1
    while (low <= high) {
      const mid = (low + high) >> 1
      if (lineOffsets[mid] <= pos) {
        low = mid + 1
      } else {
        high = mid - 1
      }
    }
    const line = high + 1
    const column = pos - lineOffsets[high]
    return { line, column }
  }

  let parseResult: any
  try {
    parseResult = parseSync(filename, code, { lang: langForFilename(filename) })
  } catch (err: any) {
    throw new Error(`[vxrn/metro] Failed to parse ${filename} for dependency extraction: ${err.message || err}`)
  }

  // oxc reports syntax errors on the result rather than throwing. ignoring them
  // yields zero dependencies, which metro turns into a bundle that is missing
  // modules and only fails at runtime, so surface it here instead.
  if (parseResult?.errors?.length) {
    throw new Error(
      `[vxrn/metro] Failed to parse ${filename} for dependency extraction: ${parseResult.errors[0].message}`
    )
  }

  if (!parseResult?.program) {
    return []
  }

  const depMap = new Map<string, MetroDependency>()

  function addDep(
    name: string,
    isESM: boolean,
    asyncType: 'async' | 'weak' | 'maybeSync' | null,
    start: number,
    end: number,
    contextParams?: MetroContextParams,
    isOptional?: boolean
  ) {
    const key = getDependencyKey(name, isESM, asyncType, contextParams)
    let entry = depMap.get(key)
    // metro reads loc.start.line / loc.end.line when it formats an
    // unable-to-resolve error. a flat {line, column} makes that error path throw
    // instead, which hides the real resolution failure behind a crash.
    const loc = { start: offsetToLoc(start), end: offsetToLoc(end) }
    if (!entry) {
      entry = {
        name,
        data: {
          key,
          asyncType,
          locs: [loc],
          isESMImportAtSource: isESM,
          isESMImport: isESM,
          index: depMap.size,
          ...(contextParams ? { contextParams } : {}),
          ...(isOptional ? { isOptional: true } : {}),
        },
      }
      depMap.set(key, entry)
    } else {
      entry.data.locs.push(loc)
    }
  }

  // metro evaluates require.context arguments instead of demanding literals, so
  // a module-scope const holding the value works there. this covers that one
  // case rather than reimplementing babel's full constant evaluation.
  const moduleConsts = collectModuleLiteralBindings(parseResult.program)

  function resolveConst(node: any): any {
    if (node?.type === 'Identifier') return moduleConsts.get(node.name)
    return node
  }

  // mirrors metro's isOptionalDependency: a require within three statement
  // levels of a try block is allowed to fail resolution. optional native modules
  // like react-native-worklets-core are required exactly this way, and treating
  // them as required fails the whole build.
  const ancestors: any[] = []
  function isOptionalHere(name: string): boolean {
    if (!allowOptionalDependencies) return false
    if (Array.isArray(allowOptionalDependencies.exclude)) {
      if (allowOptionalDependencies.exclude.includes(name)) return false
    }
    let sCount = 0
    for (let i = ancestors.length - 1; i >= 0 && sCount < 3; i--) {
      const n = ancestors[i]
      const isStatement = /(?:Statement|Declaration)$/.test(n.type)
      if (!isStatement) continue
      if (n.type === 'BlockStatement') {
        const parent = ancestors[i - 1]
        return parent?.type === 'TryStatement' && parent.block === n
      }
      sCount += 1
    }
    return false
  }

  const scopeTracker = new ScopeTracker()
  collectHoistedBindings(parseResult.program, scopeTracker.currentScope())
  collectBlockBindings(parseResult.program.body, scopeTracker.currentScope())
  for (const stmt of parseResult.program.body || []) {
    if (stmt.type === 'ImportDeclaration') {
      for (const spec of stmt.specifiers || []) {
        if (spec.local?.name) {
          scopeTracker.add(spec.local.name)
        }
      }
    }
  }

  function walk(node: any) {
    if (!node || typeof node !== 'object') return

    let pushedScope = false
    ancestors.push(node)

    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      scopeTracker.enter()
      pushedScope = true
      for (const param of node.params || []) {
        scopeTracker.addPattern(param)
      }
      if (node.type === 'FunctionExpression' && node.id?.name) {
        scopeTracker.add(node.id.name)
      }
      if (node.body) {
        collectHoistedBindings(node.body, scopeTracker.currentScope())
      }
    } else if (node.type === 'BlockStatement') {
      scopeTracker.enter()
      pushedScope = true
      collectBlockBindings(node.body, scopeTracker.currentScope())
    } else if (node.type === 'CatchClause') {
      scopeTracker.enter()
      pushedScope = true
      if (node.param) {
        scopeTracker.addPattern(node.param)
      }
    } else if (
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement'
    ) {
      const decl = node.type === 'ForStatement' ? node.init : node.left
      if (decl?.type === 'VariableDeclaration' && decl.kind !== 'var') {
        scopeTracker.enter()
        pushedScope = true
        for (const d of decl.declarations || []) {
          scopeTracker.addPattern(d.id)
        }
      }
    }

    if (node.type === 'ImportDeclaration' && node.source?.value) {
      if (node.importKind !== 'type') {
        const hasValueSpecifier =
          !node.specifiers?.length ||
          node.specifiers.some((s: any) => s.importKind !== 'type')
        if (hasValueSpecifier) {
          addDep(node.source.value, true, null, node.start, node.end)
        }
      }
    } else if (
      (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
      node.source?.value
    ) {
      if (node.exportKind !== 'type') {
        addDep(node.source.value, true, null, node.start, node.end)
      }
    } else if (node.type === 'ImportExpression') {
      if (node.source?.type === 'Literal' && typeof node.source.value === 'string') {
        addDep(node.source.value, true, 'async', node.start, node.end)
        addDep(asyncRequirePath, false, null, node.start, node.end)
      } else {
        throw new Error(`[vxrn/metro] Dynamic import with non-string literal is not supported by Metro in ${filename}`)
      }
    } else if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === 'require' &&
      !scopeTracker.isShadowed('require')
    ) {
      if (
        node.arguments?.[0]?.type === 'Literal' &&
        typeof node.arguments[0].value === 'string'
      ) {
        addDep(
          node.arguments[0].value,
          false,
          null,
          node.start,
          node.end,
          undefined,
          node.arguments[0].value !== asyncRequirePath && isOptionalHere(node.arguments[0].value)
        )
      }
    } else if (
      // require.context(dir, recursive?, filter?, mode?) registers a whole
      // directory as one dependency. one's router entry uses it for the route
      // tree, so dropping it silently omits every route from the bundle.
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      !node.callee.computed &&
      node.callee.object?.type === 'Identifier' &&
      node.callee.object.name === 'require' &&
      node.callee.property?.type === 'Identifier' &&
      node.callee.property.name === 'context' &&
      !scopeTracker.isShadowed('require')
    ) {
      const args = node.arguments || []
      // metro evaluates these arguments rather than requiring literals, so a
      // module-scope const holding the string is valid. one's router entry reads
      // its route root through exactly such a const.
      const dir = resolveConst(args[0])
      if (dir?.type !== 'Literal' || typeof dir.value !== 'string') {
        throw new Error(
          `[vxrn/metro] First argument of require.context must be a string literal in ${filename}`
        )
      }
      if (args.length > 4) {
        throw new Error(
          `[vxrn/metro] Too many arguments provided to require.context in ${filename}. Expected 4, got: ${args.length}`
        )
      }

      let recursive = true
      const recursiveArg = resolveConst(args[1])
      if (recursiveArg) {
        if (recursiveArg.type !== 'Literal' || typeof recursiveArg.value !== 'boolean') {
          throw new Error(
            `[vxrn/metro] Second argument of require.context must be an optional boolean literal in ${filename}`
          )
        }
        recursive = recursiveArg.value
      }

      let filter = { pattern: '.*', flags: '' }
      const filterArg = resolveConst(args[2])
      if (filterArg) {
        // oxc reports regex literals as Literal nodes carrying a `regex` field.
        if (filterArg.type !== 'Literal' || !filterArg.regex) {
          throw new Error(
            `[vxrn/metro] Third argument of require.context must be an optional RegExp literal in ${filename}, instead found node of type: ${filterArg.type}`
          )
        }
        filter = { pattern: filterArg.regex.pattern, flags: filterArg.regex.flags || '' }
      }

      let mode: MetroContextParams['mode'] = 'sync'
      const modeArg = resolveConst(args[3])
      if (modeArg) {
        const m = modeArg.type === 'Literal' ? modeArg.value : undefined
        if (m !== 'sync' && m !== 'eager' && m !== 'lazy' && m !== 'lazy-once') {
          throw new Error(
            `[vxrn/metro] require.context mode must be one of sync, eager, lazy, lazy-once in ${filename}`
          )
        }
        mode = m
      }

      addDep(dir.value, false, null, node.start, node.end, { recursive, filter, mode })
    }

    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range' || key === 'parent' || key === 'comments') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) walk(item)
      } else if (child && typeof child === 'object') {
        walk(child)
      }
    }

    ancestors.pop()
    if (pushedScope) {
      scopeTracker.exit()
    }
  }

  walk(parseResult.program)
  return Array.from(depMap.values())
}

function checkReservedStrings(sourceCode: string, config: MetroWorkerConfig, options: MetroWorkerOptions) {
  const reservedStrings: string[] = []
  if (
    options.customTransformOptions?.unstable_staticHermesOptimizedRequire === true
  ) {
    reservedStrings.push('_$$_METRO_MODULE_ID')
  }
  if (config.unstable_dependencyMapReservedName != null) {
    reservedStrings.push(config.unstable_dependencyMapReservedName)
  }
  for (const reservedString of reservedStrings) {
    const position = sourceCode.indexOf(reservedString)
    if (position > -1) {
      throw new SyntaxError(
        'Source code contains the reserved string `' +
          reservedString +
          '` at character offset ' +
          position
      )
    }
  }
}

/**
 * Main transform entry point conforming to Metro's worker contract with ZERO Babel.
 */
let workletsConfigured = false

/**
 * Turns on @vxrn/compiler's reanimated transform inside this metro worker
 * process when the project actually depends on reanimated.
 */
async function configureWorkletsForWorker(projectRoot: string | undefined) {
  if (workletsConfigured) return
  workletsConfigured = true
  if (!projectRoot) return

  const req = createRequire(path.resolve(projectRoot, 'package.json'))
  let hasReanimated = false
  try {
    req.resolve('react-native-reanimated/package.json')
    hasReanimated = true
  } catch {
    try {
      req.resolve('react-native-worklets/package.json')
      hasReanimated = true
    } catch {}
  }

  const { configureVXRNCompilerPlugin } = await import('@vxrn/compiler')
  configureVXRNCompilerPlugin({ enableReanimated: hasReanimated })
}

export async function transform(
  config: MetroWorkerConfig,
  projectRoot: string,
  filename: string,
  data: Buffer | string,
  options: MetroWorkerOptions
): Promise<MetroWorkerResult> {
  let sourceCode = typeof data === 'string' ? data : data.toString('utf8')

  // expo's own transform worker substitutes the source of two virtual files
  // before transforming them. this worker replaces that worker outright, so
  // without the same substitution `expo/virtual/env` stays a bare
  // `process.env` re-export and no .env file ever reaches the bundle.
  const environment = options.customTransformOptions?.environment
  const isClientEnvironment = environment !== 'node' && environment !== 'react-server'

  if (isClientEnvironment && /[\\/]expo[\\/]virtual[\\/]env\.js$/.test(filename)) {
    if (options.dev) {
      const rel = path.relative(path.dirname(filename), projectRoot).split(path.sep).join('/')
      sourceCode = `const dotEnvModules = require.context(${JSON.stringify(rel)},false,/^\\.\\/\\.env/);
export const env = !dotEnvModules.keys().length ? process.env : { ...process.env, ...['.env', '.env.development', '.env.local', '.env.development.local'].reduce((acc, file) => {
  return { ...acc, ...(dotEnvModules(file)?.default ?? {}) };
}, {}) };`
    } else {
      // production inlines every value at its use site, so reaching this module
      // at all is a bug worth naming rather than silently returning undefined.
      sourceCode = `export const env = new Proxy({}, {
  get(target, key) {
    throw new Error(\`Attempting to access internal environment variable "\${String(key)}" is not supported in production bundles.\`);
  },
});`
    }
  } else if (/(^|[\\/])\.env(\.(local|(development|production)(\.local)?))?$/.test(filename)) {
    const { parseEnvFile } = await import(
      '@expo/metro-config/build/transform-worker/dot-env-development'
    )
    sourceCode = `export default ${JSON.stringify(parseEnvFile(sourceCode, isClientEnvironment))};`
  }

  checkReservedStrings(sourceCode, config, options)

  // 1. JSON files
  if (filename.endsWith('.json')) {
    try {
      JSON.parse(sourceCode)
    } catch (err: any) {
      throw new Error(`[vxrn/metro] JSON parse error in ${filename}: ${err.message || err}`)
    }

    let code =
      config.unstable_disableModuleWrapping === true
        ? `module.exports = ${sourceCode};`
        : wrapJson(sourceCode, {
            globalPrefix: config.globalPrefix,
            moduleId: options.moduleId,
            dependencyIds: options.dependencyIds,
          })

    if (
      options.minify &&
      options.unstable_transformProfile !== 'hermes-canary' &&
      options.unstable_transformProfile !== 'hermes-stable' &&
      config.minifierPath
    ) {
      try {
        const minifier = require(config.minifierPath)
        const minified = await minifier({
          code,
          config: config.minifierConfig,
          filename,
          map: [],
        })
        code = minified.code
      } catch (err: any) {
        throw new Error(`[vxrn/metro] Minifier failed for ${filename}: ${err.message || err}`)
      }
    }

    const { lineCount, map } = countLinesAndTerminateMap(code, [])
    const outputType: MetroOutput['type'] =
      options.type === 'asset'
        ? 'js/module/asset'
        : options.type === 'script'
          ? 'js/script'
          : 'js/module'

    return {
      dependencies: [],
      output: [
        {
          data: {
            code,
            lineCount,
            map,
            functionMap: null,
          },
          type: outputType,
        },
      ],
    }
  }

  // 2. Asset files
  if (options.type === 'asset') {
    const assetRegistryPath =
      config.assetRegistryPath || 'react-native/Libraries/Image/AssetRegistry'
    let properDescriptor: any = null

    const absolutePath = path.resolve(projectRoot, filename)
    if (fs.existsSync(absolutePath)) {
      try {
        let getAssetData: any
        try {
          getAssetData = require('metro/private/Assets').getAssetData
        } catch {
          getAssetData = require('metro/src/Assets').getAssetData
        }

        if (typeof getAssetData === 'function') {
          const rawData = await getAssetData(
            absolutePath,
            filename,
            config.assetPlugins || [],
            options.platform || '',
            config.publicPath || '/assets'
          )
          const copied = { ...rawData }
          delete copied.files
          delete copied.fileSystemLocation
          delete copied.path
          properDescriptor = copied
        }
      } catch (err: any) {
        throw new Error(`[vxrn/metro] Asset resolution failed for ${filename}: ${err.message || err}`)
      }
    }

    if (!properDescriptor) {
      const ext = path.extname(filename).slice(1)
      const name = path.basename(filename, '.' + ext)
      properDescriptor = {
        __packager_asset: true,
        httpServerLocation: config.publicPath || '/assets',
        width: undefined,
        height: undefined,
        scales: [1],
        hash: crypto.createHash('md5').update(sourceCode).digest('hex'),
        name,
        type: ext,
      }
    }

    // the registry is dependency 0 below, and metro's runtime require takes a
    // module id from the dependency map. emitting the bare specifier here leaves
    // a require metro cannot resolve, so every asset throws when it renders.
    const assetDepMapName = config.unstable_dependencyMapReservedName || '_dependencyMap'
    const assetCode = `module.exports = require(${assetDepMapName}[0], ${JSON.stringify(assetRegistryPath)}).registerAsset(${JSON.stringify(properDescriptor)});`
    let code =
      config.unstable_disableModuleWrapping === true
        ? assetCode
        : wrapModule(assetCode, {
            globalPrefix: config.globalPrefix,
            moduleId: options.moduleId,
            dependencyIds: options.dependencyIds,
            dependencyMapName: config.unstable_dependencyMapReservedName,
          })

    const dependencies: MetroDependency[] = [
      {
        name: assetRegistryPath,
        data: {
          key: getDependencyKey(assetRegistryPath, false, null),
          asyncType: null,
          locs: [],
          isESMImportAtSource: false,
          isESMImport: false,
          index: 0,
        },
      },
    ]

    const { lineCount, map } = countLinesAndTerminateMap(code, [])
    return {
      dependencies,
      output: [
        {
          data: {
            code,
            lineCount,
            map,
            functionMap: null,
          },
          type: 'js/module/asset',
        },
      ],
    }
  }

  // 3. JS / TS files
  let code = sourceCode
  const intermediateMaps: any[] = []

  // Step A0: one's router entry rewrites. must run before dependency extraction
  // so the injected setup import and the inlined require.context regex are both
  // visible to it.
  const oneRouterOptions = getOneRouterMetroOptions(options)
  if (oneRouterOptions) {
    code = applyOneRouterMetro(code, filename, oneRouterOptions)
  }


  // Step A0b: React Native codegen. `codegenNativeComponent('RNSScreen')` is a
  // spec that has to become a real view config registration; without it the
  // component has no view config and the screen never mounts. Metro's default
  // pipeline gets this from @react-native/babel-plugin-codegen inside
  // @react-native/babel-preset, which this transformer replaces.
  //
  // This runs before Flow stripping because codegen reads the component's props
  // out of the type argument to codegenNativeComponent. Once Step A removes the
  // types there is nothing left to generate from, and react-native's own parser
  // rejects the file with "Could not find component config".
  try {
    const codegenRes = transformReactNativeCodegen(code, filename, projectRoot)
    if (codegenRes?.code) {
      code = codegenRes.code
      if (codegenRes.map) {
        intermediateMaps.push(codegenRes.map)
      }
    }
  } catch (err: any) {
    throw new Error(
      `[vxrn/metro] React Native codegen failed for ${filename}: ${err.message || err}`
    )
  }

  // Step A: Flow stripping
  const hasFlowPragma = code.includes('@flow')
  const isFlowCandidate =
    (filename.endsWith('.js') || filename.endsWith('.jsx')) &&
    (hasFlowPragma || FLOW_FILE_PATTERN.test(filename) || code.includes('import type'))

  if (isFlowCandidate) {
    try {
      const fft = await import('fast-flow-transform')
      const flowTransform = fft.default || fft
      const flowResult = await flowTransform({
        filename,
        source: code,
        sourcemap: true,
        dialect: 'flow',
        format: 'pretty',
      })
      if (flowResult?.code) {
        code = flowResult.code
        if (flowResult.map) {
          intermediateMaps.push(
            typeof flowResult.map === 'string' ? JSON.parse(flowResult.map) : flowResult.map
          )
        }
      }
    } catch (err: any) {
      throw new Error(`[vxrn/metro] Flow transform failed for ${filename}: ${err.message || err}`)
    }
  }

  const asyncRequirePath =
    config.asyncRequireModulePath || 'metro-runtime/src/modules/asyncRequire'

  // Step A1: tsconfig path aliases. runs after flow stripping so the parse can
  // succeed, and before dependency extraction so metro only ever sees
  // specifiers it can resolve. the substring guard keeps the extra parse off
  // the files that have no aliased import at all.
  const aliases = getModuleResolverAliases(options)
  if (aliases && projectRoot) {
    const aliasKeys = Object.keys(aliases)
    if (aliasKeys.some((k) => code.includes(k.endsWith('$') ? k.slice(0, -1) : k))) {
      code = applyModuleResolverAliases(code, filename, projectRoot, aliases)
    }
  }

  // Step A2: expo public env vars. after flow stripping so the parse succeeds,
  // before extraction so the injected `expo/virtual/env` import is seen. the
  // substring guard keeps the extra parse off files with no EXPO_PUBLIC_ read.
  if (code.includes('EXPO_PUBLIC_')) {
    code = applyExpoInlineEnvVars(code, filename, !options.dev)
  }

  // Step B: Extract dependencies using oxc-parser (zero Babel, lexical scope aware)
  const dependencies = extractDependencies(code, filename, {
    asyncRequireModulePath: asyncRequirePath,
    allowOptionalDependencies: config.allowOptionalDependencies,
  })

  // Step C: React Compiler (via @vxrn/compiler / oxc-transform-react)
  const shouldRunReactCompiler =
    Boolean(options.customTransformOptions?.reactCompiler) ||
    code.includes('"use memo"') ||
    code.includes("'use memo'")

  if (shouldRunReactCompiler) {
    try {
      const { transformOxcReactCompiler } = await import('@vxrn/compiler')
      const compilerRes = await transformOxcReactCompiler(filename, code, '19')
      if (compilerRes?.code) {
        code = compilerRes.code
        if (compilerRes.map) {
          intermediateMaps.push(
            typeof compilerRes.map === 'string' ? JSON.parse(compilerRes.map) : compilerRes.map
          )
        }
      }
    } catch (err: any) {
      throw new Error(`[vxrn/metro] React Compiler failed for ${filename}: ${err.message || err}`)
    }
  }

  // Step D: Native Worklets (via @vxrn/compiler)
  //
  // @vxrn/compiler's reanimated gate is process-global state set by one's vite
  // plugin. metro runs its transformer in separate worker processes that never
  // see that call, so the gate reads false there and every worklet in the app
  // silently ships untransformed. configure it once per worker from the same
  // fact the vite side derives it from: does the project have reanimated.
  await configureWorkletsForWorker(projectRoot)

  let shouldRunWorklets = Boolean(options.customTransformOptions?.worklets)
  if (!shouldRunWorklets) {
    const { shouldTransformWorklets } = await import('@vxrn/compiler')
    shouldRunWorklets = shouldTransformWorklets({ id: filename, code })
  }

  if (shouldRunWorklets) {
    try {
      const { transformWorklets } = await import('@vxrn/compiler')
      // no pluginVersion here: the compiler reads it from the worklets package
      // the app actually installed, and worklets throws at runtime when the
      // stamped version is not exactly its own.
      const workletRes = await transformWorklets(filename, code, true, {
        projectRoot,
      })
      if (workletRes?.code) {
        code = workletRes.code
        if (workletRes.map) {
          intermediateMaps.push(
            typeof workletRes.map === 'string' ? JSON.parse(workletRes.map) : workletRes.map
          )
        }
      }
    } catch (err: any) {
      throw new Error(`[vxrn/metro] Worklets transform failed for ${filename}: ${err.message || err}`)
    }
  }

  // Step E: Hermes lowering + CommonJS + TS/JSX via oxc + esbuild (zero Babel, zero SWC)
  const lang = langForFilename(filename)

  const { transformSync: oxcTransform } = await import('oxc-transform')
  let oxcRes: any
  try {
    oxcRes = oxcTransform(filename, code, {
      lang,
      // Hermes supports BigInt but not async generators or for-await-of, and no
      // single oxc target expresses that: es2020 keeps BigInt and leaves async
      // generators in, es2017 lowers them but rejects BigInt literals. oxc's
      // `hermes*` targets claim async generators are supported, which the device
      // disproves. So the level is chosen per module. A module using both is
      // vanishingly rare and fails loudly here rather than at runtime.
      target: HERMES_UNSUPPORTED_ASYNC_RE.test(code) ? 'es2017' : 'es2020',
      assumptions: {
        setPublicClassFields: true,
      },
      jsx: {
        runtime: 'automatic',
        development: Boolean(options.dev),
      },
      sourcemap: true,
    })
  } catch (err: any) {
    throw new Error(`[vxrn/metro] Oxc transform failed for ${filename}: ${err.message || err}`)
  }

  // oxc reports errors on the result rather than throwing. falling back to the
  // untransformed source here leaves jsx and typescript in place, which only
  // fails later in esbuild with a misleading message about the wrong step.
  if (oxcRes.errors?.length) {
    throw new Error(
      `[vxrn/metro] Oxc transform failed for ${filename}: ${oxcRes.errors[0].message || oxcRes.errors[0]}`
    )
  }

  code = oxcRes.code || code
  if (oxcRes.map) {
    intermediateMaps.push(
      typeof oxcRes.map === 'string' ? JSON.parse(oxcRes.map) : oxcRes.map
    )
  }

  if (options.type !== 'script') {
    try {
      const esbuild = await import('esbuild')
      const esbuildRes = esbuild.transformSync(code, {
        loader: 'js',
        format: 'cjs',
        target: 'es2020',
        sourcemap: true,
        sourcefile: filename,
      })
      code = esbuildRes.code
      if (esbuildRes.map) {
        intermediateMaps.push(
          typeof esbuildRes.map === 'string' ? JSON.parse(esbuildRes.map) : esbuildRes.map
        )
      }
    } catch (err: any) {
      throw new Error(`[vxrn/metro] esbuild CJS lowering failed for ${filename}: ${err.message || err}`)
    }
  }

  // Step E2: per-iteration loop bindings for Hermes.
  //
  // Runs after esbuild because esbuild's own __copyProps interop helper is built
  // on `for (let key of ...)` with a closure in the body, which under Hermes
  // makes every named export of a module resolve to its last one. See
  // transformHermesLoops for the engine detail and the bytecode evidence.
  try {
    const loopsRes = transformHermesLoops(code, filename)
    if (loopsRes) {
      code = loopsRes.code
      for (const map of loopsRes.maps) {
        intermediateMaps.push(map)
      }
    }
  } catch (err: any) {
    throw new Error(
      `[vxrn/metro] Hermes loop-binding transform failed for ${filename}: ${err.message || err}`
    )
  }

  // step B read the original source, but steps C through E both add and remove
  // imports: they inject the jsx runtime, react/compiler-runtime, oxc's
  // @oxc-project/runtime helpers and the asset registry, and oxc elides
  // type-only imports typescript never emits. metro resolves and bundles exactly
  // this list, so an extra entry is an unresolvable module that fails the build
  // and a missing one is a module absent from the bundle. reconcile against what
  // the final code actually requires.
  const finalDeps = extractDependencies(code, filename, {
    asyncRequireModulePath: asyncRequirePath,
    allowOptionalDependencies: config.allowOptionalDependencies,
  })
  const finalNames = new Set(finalDeps.map((d) => d.name))
  // keep the original entries, which carry the source's ESM metadata that the
  // cjs-lowered code no longer shows, then append whatever was injected.
  const reconciled = dependencies.filter((d) => finalNames.has(d.name))
  for (const injected of finalDeps) {
    if (reconciled.some((d) => d.name === injected.name)) continue
    reconciled.push(injected)
  }
  dependencies.length = 0
  for (const dep of reconciled) {
    dependencies.push({ ...dep, data: { ...dep.data, index: dependencies.length } })
  }

  // Step F: Module Wrapping & Dependency ABI Rewriting with full sourcemap tracking
  const depMapName = config.unstable_dependencyMapReservedName || '_dependencyMap'

  if (options.type === 'script') {
    const msScript = new MagicString(code)
    msScript.prepend(`(function (global) {\n`)
    msScript.append(
      `\n})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);`
    )
    code = msScript.toString()
    intermediateMaps.push(msScript.generateMap({ source: filename, hires: true, includeContent: true }))
  } else if (config.unstable_disableModuleWrapping === true) {
    const rewriteRes = rewriteDependencyCalls(code, dependencies, depMapName, filename, asyncRequirePath)
    code = rewriteRes.code
    if (rewriteRes.map) {
      intermediateMaps.push(rewriteRes.map)
    }
  } else {
    const rewriteRes = rewriteDependencyCalls(code, dependencies, depMapName, filename, asyncRequirePath)
    if (rewriteRes.map) {
      intermediateMaps.push(rewriteRes.map)
    }
    const msWrap = new MagicString(rewriteRes.code)
    const globalPrefix = config.globalPrefix || ''
    const header = `function (global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, ${depMapName}) {\nvar require = _$$_REQUIRE;\n`
    const footer = `\n}`

    msWrap.prepend(`${globalPrefix}__d(${header}`)
    if (options.moduleId !== undefined) {
      const depIds = options.dependencyIds ? JSON.stringify(options.dependencyIds) : '[]'
      msWrap.append(`${footer}, ${JSON.stringify(options.moduleId)}, ${depIds});`)
    } else {
      msWrap.append(`${footer});`)
    }

    code = msWrap.toString()
    intermediateMaps.push(msWrap.generateMap({ source: filename, hires: true, includeContent: true }))
  }

  // Step G: Minification
  if (
    options.minify &&
    options.unstable_transformProfile !== 'hermes-canary' &&
    options.unstable_transformProfile !== 'hermes-stable' &&
    config.minifierPath
  ) {
    try {
      const minifier = require(config.minifierPath)
      const minified = await minifier({
        code,
        config: config.minifierConfig,
        filename,
        map: [],
      })
      code = minified.code
      if (minified.map) {
        intermediateMaps.push(
          typeof minified.map === 'string' ? JSON.parse(minified.map) : minified.map
        )
      }
    } catch (err: any) {
      throw new Error(`[vxrn/metro] Minifier failed for ${filename}: ${err.message || err}`)
    }
  }

  // Step H: Compose all pipeline maps and convert to Metro raw mapping segment tuples
  let rawMappings: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]> = []

  if (intermediateMaps.length > 0) {
    const cleanMaps = intermediateMaps
      .map((m) => (typeof m === 'string' ? JSON.parse(m) : m))
      .filter(Boolean)

    if (cleanMaps.length > 0) {
      const composed =
        cleanMaps.length === 1
          ? cleanMaps[0]
          : remapping(cleanMaps.slice().reverse(), () => null)
      rawMappings = convertSourceMapToMetroRawMappings(composed)
    }
  }

  const { lineCount, map } = countLinesAndTerminateMap(code, rawMappings)

  return {
    dependencies,
    output: [
      {
        data: {
          code,
          lineCount,
          map,
          functionMap: null,
        },
        type: options.type === 'script' ? 'js/script' : 'js/module',
      },
    ],
  }
}

export default {
  transform,
  getCacheKey,
  wrapModule,
  wrapJson,
  extractDependencies,
  rewriteDependencyCalls,
  convertSourceMapToMetroRawMappings,
}
