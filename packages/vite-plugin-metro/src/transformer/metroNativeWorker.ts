import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { parseSync } from 'oxc-parser'
import MagicString from 'magic-string'
import remapping from '@jridgewell/remapping'
import { TraceMap, eachMapping } from '@jridgewell/trace-mapping'

export type MetroDependencyData = {
  key?: string
  asyncType?: 'async' | 'weak' | 'maybeSync' | null
  locs: Array<{ line: number; column: number }>
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
  asyncType: 'async' | 'weak' | 'maybeSync' | null = null
): string {
  let key = `${name}\0${isESM ? 'import' : 'require'}`
  if (asyncType != null) {
    key += `\0${asyncType}`
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
  }
): MetroDependency[] {
  const asyncRequirePath =
    options?.asyncRequireModulePath || 'metro-runtime/src/modules/asyncRequire'
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

  function addDep(name: string, isESM: boolean, asyncType: 'async' | 'weak' | 'maybeSync' | null, pos: number) {
    const key = getDependencyKey(name, isESM, asyncType)
    let entry = depMap.get(key)
    const loc = offsetToLoc(pos)
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
        },
      }
      depMap.set(key, entry)
    } else {
      entry.data.locs.push(loc)
    }
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
          addDep(node.source.value, true, null, node.start)
        }
      }
    } else if (
      (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
      node.source?.value
    ) {
      if (node.exportKind !== 'type') {
        addDep(node.source.value, true, null, node.start)
      }
    } else if (node.type === 'ImportExpression') {
      if (node.source?.type === 'Literal' && typeof node.source.value === 'string') {
        addDep(node.source.value, true, 'async', node.start)
        addDep(asyncRequirePath, false, null, node.start)
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
        addDep(node.arguments[0].value, false, null, node.start)
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
export async function transform(
  config: MetroWorkerConfig,
  projectRoot: string,
  filename: string,
  data: Buffer | string,
  options: MetroWorkerOptions
): Promise<MetroWorkerResult> {
  const sourceCode = typeof data === 'string' ? data : data.toString('utf8')
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

  // Step B: Extract dependencies using oxc-parser (zero Babel, lexical scope aware)
  const dependencies = extractDependencies(code, filename, {
    asyncRequireModulePath: asyncRequirePath,
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
  let shouldRunWorklets = Boolean(options.customTransformOptions?.worklets)
  if (!shouldRunWorklets) {
    try {
      const { shouldTransformWorklets } = await import('@vxrn/compiler')
      shouldRunWorklets = shouldTransformWorklets?.({ id: filename, code }) ?? false
    } catch {
      shouldRunWorklets = code.includes('worklet')
    }
  }

  if (shouldRunWorklets) {
    try {
      const { transformWorklets } = await import('@vxrn/compiler')
      const workletRes = await transformWorklets(filename, code, true, {
        projectRoot,
        pluginVersion: '3.0.0',
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
      target: 'es2020',
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

  // steps C through E inject their own imports after step B extracted
  // dependencies: the jsx runtime, react/compiler-runtime, oxc's
  // @oxc-project/runtime helpers and the asset registry. metro only bundles what
  // it was told about, so an unregistered require is a module missing from the
  // bundle that throws the moment it runs. re-read the final code and register
  // whatever it actually requires rather than naming each injector here.
  for (const injected of extractDependencies(code, filename, {
    asyncRequireModulePath: asyncRequirePath,
  })) {
    if (dependencies.some((d) => d.name === injected.name)) {
      continue
    }
    dependencies.push({
      ...injected,
      data: {
        ...injected.data,
        index: dependencies.length,
      },
    })
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
