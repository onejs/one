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
  return {
    id,
    calculate,
    name,
    platform: 'web',
    source: `import { ${name} as calculate } from ${JSON.stringify(calculate)};
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
  if (!source.includes('defineBackgroundComputation') || id.includes(marker)) return
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
