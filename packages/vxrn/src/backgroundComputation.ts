import MagicString from 'magic-string'
import { parse } from 'sucrase/dist/parser/index.js'
import { IdentifierRole } from 'sucrase/dist/parser/tokenizer/index.js'
import { TokenType } from 'sucrase/dist/parser/tokenizer/types.js'

export type BackgroundModule = {
  id: string
  source: string
  calculate: string
  name: string
  platform: 'web' | 'native'
}

export type BackgroundTransformOptions = {
  platform: 'web' | 'native'
  resolve: (source: string, importer: string) => string
  nativeModule?: (module: BackgroundModule) => string
  workerFactory?: (module: BackgroundModule) => string
  pureModule?: (id: string, source: string) => string
}

const marker = '.__one_background_worker_'
const hex = (name: string) =>
  [...new TextEncoder().encode(name)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

// file-shaped worker entries survive Vite's query stripping and package graphs.
export function loadBackgroundComputationModule(
  id: string
): BackgroundModule | undefined {
  const match = id.match(/^(.*?)\.__one_background_worker_([a-f0-9]+)\.js(?:\?.*)?$/)
  if (!match) return
  const [, calculate, encoded] = match
  const name = new TextDecoder().decode(
    Uint8Array.from(encoded.match(/../g)!, (byte) => Number.parseInt(byte, 16))
  )
  const entry = name.startsWith('__oneBackground_')
    ? `${calculate}?one-background-pure`
    : calculate
  return {
    id,
    calculate,
    name,
    platform: 'web',
    source: `import { ${name} as calculate } from ${JSON.stringify(entry)};
self.onmessage = ({ data: { revision, input } }) => {
  try {
    const value = calculate(input);
    if (value instanceof Promise) throw new TypeError('background computations must be synchronous');
    self.postMessage({ ok: true, result: { revision, value } });
  } catch (error) {
    self.postMessage({ ok: false, revision, error: String(error) });
  }
};`,
  }
}

// hosts supply path resolution and worker transport; selection and protocol stay here.
export function transformBackgroundComputations(
  source: string,
  id: string,
  options: BackgroundTransformOptions
) {
  if (id.includes(marker) || id.includes('.__one_background_native_')) return
  if (id.endsWith('?one-background-pure')) return
  const directive = transformBackgroundDirectives(source, id, options)
  if (directive) return directive
  if (!source.includes('defineBackgroundComputation')) return
  const file = parse(
    source,
    !/\.[cm]?ts(?:\?|$)/.test(id),
    /\.[cm]?tsx?(?:\?|$)/.test(id),
    false
  )
  const { tokens } = file
  const text = (index: number) =>
    tokens[index] ? source.slice(tokens[index].start, tokens[index].end) : ''
  const imports = new Map<string, { source: string; name: string }>()
  const definitions = new Set<string>()
  for (let index = 0; index < tokens.length; index++) {
    if (text(index) !== 'import' || tokens[index].isType || text(index + 1) !== '{')
      continue
    const start = index + 2
    let end = start
    while (end < tokens.length && text(end) !== '}') end++
    if (text(end + 1) !== 'from' || tokens[end + 2]?.type !== TokenType.string) continue
    const specifier = text(end + 2).slice(1, -1)
    for (let binding = start; binding < end; binding++) {
      if (tokens[binding].isType || tokens[binding].type !== TokenType.name) continue
      const name = text(binding)
      const local = text(binding + 1) === 'as' ? text(binding + 2) : name
      imports.set(local, { source: specifier, name })
      if (specifier === 'one/background' && name === 'defineBackgroundComputation')
        definitions.add(local)
      if (local !== name) binding += 2
    }
    index = end + 2
  }
  if (!definitions.size) return
  const code = new MagicString(source)
  const modules: BackgroundModule[] = []
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.identifierRole !== IdentifierRole.Access || !definitions.has(text(index)))
      continue
    let opening = index + 1
    while (tokens[opening]?.isType) opening++
    if (text(opening) !== '(') continue
    let binding = index - 2
    while (tokens[binding]?.isType) binding--
    if (
      token.scopeDepth !== 0 ||
      text(index - 1) !== '=' ||
      tokens[binding]?.identifierRole !== IdentifierRole.TopLevelDeclaration
    )
      throw new Error(
        `[one background] ${id}: definitions must be module-scope variables`
      )
    const argument = tokens[opening + 1]
    const calculate =
      argument?.type === TokenType.name ? imports.get(text(opening + 1)) : undefined
    if (!calculate || !calculate.source.startsWith('.') || text(opening + 2) !== ')')
      throw new Error(
        `[one background] ${id}: defineBackgroundComputation requires one named import from a relative pure module at module scope`
      )
    const resolved = options.resolve(calculate.source, id)
    if (options.platform === 'native') {
      const local = `__oneBackgroundCalculate${modules.length}`
      const module: BackgroundModule = {
        id: `${resolved}.__one_background_native_${hex(calculate.name)}.js`,
        source: `export { ${calculate.name} } from ${JSON.stringify(resolved)};`,
        calculate: resolved,
        name: calculate.name,
        platform: 'native',
      }
      const selected = options.nativeModule
        ? options.nativeModule(module)
        : `${calculate.source}?one-background=${encodeURIComponent(calculate.name)}`
      code.prepend(
        `import { ${calculate.name} as ${local} } from ${JSON.stringify(selected)};\n`
      )
      code.overwrite(argument.start, argument.end, local)
      modules.push(module)
    } else {
      const module = loadBackgroundComputationModule(
        `${resolved}${marker}${hex(calculate.name)}.js`
      )!
      const factory = options.workerFactory
        ? options.workerFactory(module)
        : `() => new Worker(new URL(${JSON.stringify(module.id)}, import.meta.url), { type: 'module' })`
      code.appendLeft(tokens[opening + 2].start, `, ${factory}`)
      modules.push(module)
    }
  }
  if (!modules.length) return
  return { code: code.toString(), map: code.generateMap({ hires: true }), modules }
}

type BackgroundFunction = {
  name: string
  start: number
  end: number
  declaration: boolean
  asyncStart?: number
}

function backgroundFunctions(source: string, id: string) {
  const functions: BackgroundFunction[] = []
  if (!source.includes('use background')) return { functions, directives: [] }
  const { tokens, scopes } = parse(
    source,
    !/\.[cm]?ts(?:\?|$)/.test(id),
    /\.[cm]?tsx?(?:\?|$)/.test(id),
    false
  )
  const text = (index: number) => source.slice(tokens[index]?.start, tokens[index]?.end)
  const directives = new Set<number>()
  const prologue = (start: number) => {
    let background = false
    for (let index = start; tokens[index]?.type === TokenType.string; ) {
      if (text(index).slice(1, -1) === 'use background') {
        directives.add(index)
        background = true
      }
      index++
      if (text(index) === ';') index++
      else if (!/[\r\n]/.test(source.slice(tokens[index - 1].end, tokens[index].start)))
        break
    }
    return background
  }
  const moduleDirective = prologue(0)
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.scopeDepth !== 0 || token.isType) continue
    const declaration = text(index) === 'function'
    const nameIndex = declaration ? index + 1 : index
    if (tokens[nameIndex]?.identifierRole !== IdentifierRole.TopLevelDeclaration) continue
    const name = text(nameIndex)
    let start = index
    let end: number | undefined
    if (declaration) {
      const scope = scopes.find(
        (scope) =>
          scope.startTokenIndex > nameIndex &&
          text(scope.startTokenIndex) === '(' &&
          tokens[scope.startTokenIndex].scopeDepth === 1
      )
      end = scope?.endTokenIndex
    } else {
      let equals = index + 1
      while (tokens[equals]?.isType) equals++
      if (text(equals) !== '=') continue
      end = tokens[equals].rhsEndIndex ?? undefined
      start = equals + 1
      const expression = text(start) === 'async' ? start + 1 : start
      if (
        text(expression) !== 'function' &&
        !(text(expression) === '(' && tokens[expression].scopeDepth === 1) &&
        !(
          tokens[expression]?.identifierRole ===
            IdentifierRole.FunctionScopedDeclaration && text(expression + 1) === '=>'
        )
      )
        continue
    }
    if (end === undefined) continue
    let body = start
    while (
      body < end &&
      !(text(body) === '{' && tokens[body].scopeDepth === 2 && !tokens[body].isType)
    )
      body++
    const arrow = tokens
      .slice(start, end)
      .some(
        (token) => token.scopeDepth === 1 && source.slice(token.start, token.end) === '=>'
      )
    if (body === end && !arrow) continue
    const selected = body < end && prologue(body + 1)
    if (!moduleDirective && !selected) continue
    if (
      tokens
        .slice(start, end)
        .some(
          (token) => !token.isType && source.slice(token.start, token.end) === 'await'
        )
    )
      throw new Error(
        `[one background] ${id}: background computations cannot await; return a synchronous calculation`
      )
    const asyncIndex = declaration ? index - 1 : start
    functions.push({
      name,
      start: tokens[start].start,
      end: tokens[end - 1].end,
      declaration,
      asyncStart: text(asyncIndex) === 'async' ? tokens[asyncIndex].start : undefined,
    })
    index = end - 1
  }
  for (let index = 0; index < tokens.length; index++) {
    if (
      tokens[index].type !== TokenType.string ||
      text(index).slice(1, -1) !== 'use background'
    )
      continue
    if (!directives.has(index) && text(index - 1) === '{')
      throw new Error(
        `[one background] ${id}: background functions must have a module-scope name`
      )
  }
  if (moduleDirective && !functions.length)
    throw new Error(`[one background] ${id}: a background module must define functions`)
  return {
    functions,
    directives: [...directives].map((index) => ({
      start: tokens[index].start,
      end: tokens[index].end,
    })),
  }
}

const backgroundAdapter = (name: string) => `__oneBackground_${hex(name)}`

export function backgroundDirectiveSource(source: string, id: string) {
  const { functions, directives } = backgroundFunctions(source, id)
  if (!functions.length) return
  const code = new MagicString(source)
  for (const directive of directives) code.remove(directive.start, directive.end)
  for (const fn of functions) {
    if (fn.asyncStart !== undefined)
      code.remove(fn.asyncStart, fn.asyncStart + 'async'.length)
    code.append(
      `\nexport function ${backgroundAdapter(fn.name)}(input) { return ${fn.name}(...input); }\n`
    )
  }
  return { code: code.toString(), map: code.generateMap({ hires: true }), modules: [] }
}

function transformBackgroundDirectives(
  source: string,
  id: string,
  options: BackgroundTransformOptions
) {
  const { functions, directives } = backgroundFunctions(source, id)
  if (!functions.length) return
  const pure = backgroundDirectiveSource(source, id)!
  const calculate = options.pureModule ? options.pureModule(id, pure.code) : id
  const code = new MagicString(source)
  for (const directive of directives)
    if (!functions.some((fn) => fn.start <= directive.start && fn.end >= directive.end))
      code.remove(directive.start, directive.end)
  const modules: BackgroundModule[] = []
  let helper = '__oneCreateBackgroundFunction'
  while (source.includes(helper)) helper += '_'
  code.prepend(
    `import { __createBackgroundFunction as ${helper} } from 'one/background';\n`
  )
  for (const fn of functions) {
    const name = backgroundAdapter(fn.name)
    let proxy = `${name}_call`
    while (source.includes(proxy)) proxy += '_'
    const module: BackgroundModule =
      options.platform === 'web'
        ? loadBackgroundComputationModule(`${calculate}${marker}${hex(name)}.js`)!
        : {
            id: `${calculate}.__one_background_native_${hex(name)}.js`,
            calculate,
            name,
            platform: 'native',
            source: `export { ${name} } from ${JSON.stringify(calculate)};`,
          }
    let factory: string
    if (options.platform === 'web') {
      if (options.pureModule)
        module.source = module.source.replace(
          JSON.stringify(`${calculate}?one-background-pure`),
          JSON.stringify(calculate)
        )
      factory = options.workerFactory
        ? options.workerFactory(module)
        : `() => new Worker(new URL(${JSON.stringify(module.id)}, import.meta.url), { type: 'module' })`
    } else {
      const selected = options.nativeModule
        ? options.nativeModule(module)
        : `${id}?one-background=${name}`
      const local = `${proxy}_calculate`
      code.prepend(`import { ${name} as ${local} } from ${JSON.stringify(selected)};\n`)
      factory = local
    }
    code.prepend(`var ${proxy};\n`)
    const call = `(${proxy} || (${proxy} = ${helper}(${factory})))(...args)`
    code.overwrite(
      fn.start,
      fn.end,
      fn.declaration
        ? `function ${fn.name}(...args) { return ${call}; }`
        : `(...args) => ${call}`
    )
    modules.push(module)
  }
  return { code: code.toString(), map: code.generateMap({ hires: true }), modules }
}

// selected graphs expose __exportN; both native hosts use this runtime cache wrapper.
export function createBackgroundWorkletModule(
  bundle: string,
  names: readonly string[],
  key: string
) {
  const loader = `__oneLoadWorkletModule_${key}`
  return `function ${loader}() {
  'worklet';
  const cache = globalThis.__oneWorkletImportCache || (globalThis.__oneWorkletImportCache = new WeakMap());
  let namespace = cache.get(${loader});
  if (namespace === undefined) {
    ${bundle}
    namespace = __oneWorkletBundle;
    cache.set(${loader}, namespace);
  }
  return namespace;
}\n${names
    .map(
      (name, index) => `function __oneExport${index}(...args) {
  'worklet';
  return (0, ${loader}().__export${index})(...args);
}
export { __oneExport${index} as ${name} };`
    )
    .join('\n')}`
}

export function assertBackgroundDependency(source: string) {
  const name = source.replaceAll('\\', '/')
  if (
    name.startsWith('node:') ||
    /(?:^|\/node_modules\/)(?:react|react-native|react-native-worklets|react-native-reanimated|@react-native)(?:\/|$)/.test(
      name
    )
  )
    throw new Error(
      `[one background] runtime dependency ${source} is not pure JavaScript`
    )
}

export type BackgroundGraphModule = {
  id: number
  code: string
  dependencies: readonly (number | null)[]
}

// graph hosts supply compiled CommonJS factories; runtime loading is isolated from the app.
export function bundleBackgroundGraph(
  modules: readonly BackgroundGraphModule[],
  entry: number,
  names: readonly string[]
) {
  return `var __oneWorkletBundle = (function () {
  const factories = { ${modules.map((module) => `${module.id}: function(global, _require, _importDefault, _importAll, module, exports, _dependencyMap) {\n${module.code}\n}`).join(',\n')} };
  const dependencies = ${JSON.stringify(Object.fromEntries(modules.map((module) => [module.id, module.dependencies])))};
  const cache = Object.create(null);
  function require(id) {
    if (cache[id]) return cache[id].exports;
    const module = cache[id] = { exports: {} };
    factories[id](globalThis, require, importDefault, importAll, module, module.exports, dependencies[id]);
    return module.exports;
  }
  function importDefault(id) { const value = require(id); return value && value.__esModule ? value.default : value; }
  function importAll(id) { const value = require(id); return value && value.__esModule ? value : Object.assign({ default: value }, value); }
  const namespace = require(${entry});
  return { ${names.map((name, index) => `__export${index}: namespace[${JSON.stringify(name)}]`).join(', ')} };
})();`
}
