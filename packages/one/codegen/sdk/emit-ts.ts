import {
  Bridge,
  NO_GENERICS,
  callbackOut,
  outPointee,
  type DeclarationInfo,
} from './bridge'
import { splitTitle, type Entry, type Skipped } from './emit'
import { loadGraph, type Symbol } from './graph'
import { parameterType, parseType, type SwiftType } from './types'
import type { WireHint } from '../../src/platform/sdk/wire'

// `table` names the native table the calls reach, the module by default
type Output = { module: string; table?: string; entries: Omit<Entry, 'swift'>[]; skipped: Skipped[] }
type E = Output['entries'][number]
const quote = (value: unknown) => JSON.stringify(value)
const cleanOwner = (name: string) => {
  let depth = 0
  let out = ''
  for (const char of name) {
    if (char === '<') depth++
    else if (char === '>') depth--
    else if (!depth && char !== '`') out += char
  }
  return out
}
const identifier = (name: string) =>
  name.replace(/[^A-Za-z0-9_$]/g, '_').replace(/^(?=\d)/, '_') || 'value'
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '')
const labelName = (base: string, labels: string[]) =>
  identifier(
    base +
      labels
        .filter((l) => l !== '_')
        .map(cap)
        .join('')
  )
const localName = (path: string[]) => identifier(path.join('_'))
const reserved = new Set([
  'default',
  'new',
  'class',
  'function',
  'var',
  'let',
  'const',
  'delete',
  'return',
  'in',
  'instanceof',
  'typeof',
  'void',
  'yield',
  'await',
  'this',
  'super',
  'arguments',
  'eval',
  'with',
  'switch',
  'case',
  'throw',
  'try',
  'catch',
  'finally',
  'break',
  'continue',
  'do',
  'else',
  'export',
  'extends',
  'for',
  'if',
  'import',
  'while',
  'enum',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'static',
])
const parameterName = (name: string, i: number) => {
  const value = identifier(name === '_' ? `arg${i}` : name)
  return reserved.has(value) ? `${value}_` : value
}

// property getter/setter pairs share a name; callable overloads use swift labels.
export function facadeNames(entries: readonly E[]): Map<string, string> {
  const groups = new Map<string, E[]>()
  for (const e of entries) {
    const scope = `${cleanOwner(e.owner ?? '')}:${e.name}`
    groups.set(scope, [...(groups.get(scope) ?? []), e])
  }
  const names = new Map<string, string>()
  for (const group of groups.values()) {
    const overloaded = new Set(group.map((e) => e.usr)).size > 1
    const used = new Map<string, string>()
    for (const e of group) {
      let name =
        overloaded && !['get', 'set'].includes(e.kind)
          ? labelName(
              e.name,
              e.params.map((p) => p.label)
            )
          : identifier(e.name)
      if (name === 'constructor' || name === '$handle') name += 'Value'
      if (!e.owner && reserved.has(name)) name += 'Value'
      if (used.has(name) && used.get(name) !== e.usr) name += String(e.id)
      used.set(name, e.usr)
      names.set(e.key, name)
    }
  }
  return names
}

class Facade {
  names: Map<string, string>
  imports = new Map<string, Map<string, string>>()
  infos: Map<string, DeclarationInfo>
  graph: ReturnType<typeof loadGraph>
  symbols: Map<string, Symbol>
  graphs = new Map<string, NonNullable<ReturnType<typeof loadGraph>>>()
  usedProtocols = new Map<string, DeclarationInfo>()
  constructor(
    readonly output: Output,
    readonly bridge: Bridge
  ) {
    this.names = facadeNames(output.entries)
    this.infos = new Map(
      [...bridge.index.values()].map((info) => [
        `${info.module}.${info.path.join('.')}`,
        info,
      ])
    )
    this.graph = loadGraph(output.module)
    if (this.graph) this.graphs.set(output.module, this.graph)
    this.symbols = new Map(
      this.graph?.symbols.map((s) => [s.identifier.precise, s]) ?? []
    )
  }
  source(module: string) {
    if (!this.graphs.has(module)) {
      const graph = loadGraph(module)
      if (graph) this.graphs.set(module, graph)
    }
    return this.graphs.get(module)
  }
  alias(info: DeclarationInfo): SwiftType | undefined {
    if (info.alias) return info.alias
    if (info.kind !== 'typealias') return undefined
    const fragments =
      this.source(info.module)?.symbols.find((s) => s.identifier.precise === info.usr)
        ?.declarationFragments ?? []
    const eq = fragments.findIndex((f) => f.kind === 'text' && f.spelling.includes('='))
    if (eq < 0) return undefined
    return parseType([
      {
        ...fragments[eq],
        spelling: fragments[eq].spelling.slice(fragments[eq].spelling.indexOf('=') + 1),
      },
      ...fragments.slice(eq + 1),
    ])
  }
  implementable(info: DeclarationInfo) {
    return (
      info.implementable !== false &&
      !this.output.skipped.some((s) => s.usr === `implementation:${info.usr}`)
    )
  }
  info(type: Extract<SwiftType, { k: 'named' }>) {
    return (
      this.bridge.index.get(type.usr ?? '') ??
      this.infos.get(type.name) ??
      this.infos.get(`${this.output.module}.${type.name}`)
    )
  }
  reference(info: DeclarationInfo) {
    const name = localName(info.path)
    if (info.module === this.output.module) return name
    const alias = `_${identifier(info.module)}_${name}`
    const imports = this.imports.get(info.module) ?? new Map<string, string>()
    imports.set(name, alias)
    this.imports.set(info.module, imports)
    return alias
  }
  type(type: SwiftType | undefined, input = false, depth = 0): string {
    if (!type) return 'void'
    if (depth > 20) return 'unknown'
    const sub = (t: SwiftType, incoming = input) => this.type(t, incoming, depth + 1)
    switch (type.k) {
      case 'optional':
        return `(${sub(type.t)}) | null`
      case 'array':
      case 'variadic':
        return `Array<${sub(type.t)}>`
      case 'inout':
        return sub(type.t)
      case 'existential':
        return sub(type.t)
      case 'metatype':
        return 'string'
      case 'composition':
        return type.items.map((t) => `(${sub(t)})`).join(' & ')
      case 'dictionary': {
        const key = sub(type.key)
        return key === 'number' || key === 'string' || /^['"]/.test(key)
          ? `Record<${key}, ${sub(type.value)}>`
          : `NativeMap<${key}, ${sub(type.value)}>`
      }
      case 'tuple':
        return !type.items.length
          ? 'void'
          : type.items.every((i) => i.label)
            ? `{ ${type.items.map((i) => `${quote(i.label!)}: ${sub(i.t)}`).join('; ')} }`
            : `[${type.items.map((i) => sub(i.t)).join(', ')}]`
      case 'function': {
        const params = type.params
          .map((p, i) => {
            const out = input ? callbackOut(p.t) : undefined
            return `arg${i}: ${out ? `NativeOut<${sub(out, false)}>` : sub(p.t, !input)}`
          })
          .join(', ')
        const result = sub(type.result, input)
        return `((${params}) => ${!input || type.async ? `Promise<${result}>` : result})`
      }
      case 'named': {
        const name = type.name.split('.').at(-1)!
        if (name === 'Optional' && type.args[0])
          return sub({ k: 'optional', t: type.args[0], implicit: false })
        if (['Array', 'Set', 'ContiguousArray'].includes(name) && type.args[0])
          return `Array<${sub(type.args[0])}>`
        if (name === 'Dictionary' && type.args.length === 2)
          return sub({ k: 'dictionary', key: type.args[0], value: type.args[1] })
        const info = this.info(type)
        const alias = info && this.alias(info)
        if (alias)
          return sub(
            this.bridge.substitute(alias, {
              ...NO_GENERICS,
              resolved: new Map(
                (info.genericParameters ?? []).map((p, i) => [
                  p,
                  type.args[i] ?? { k: 'named', name: 'Any', args: [] },
                ])
              ),
            })
          )
        const mapped = this.bridge.type(type, input ? 'input' : 'output', NO_GENERICS)
        // scalars, foundation values, geometry and typed pointer buffers already have a plain form.
        if (
          mapped.ok &&
          !/\b(?:Handle|Implements|NativeOut|NativeMap)</.test(mapped.ts) &&
          !(info?.cases?.length || info?.optionSet || info?.rawValue)
        )
          return mapped.ts.replace(/\bDate\b/g, 'globalThis.Date')
        if (info?.kind === 'associatedtype') return 'unknown'
        if (info) {
          const ref = this.reference(info)
          if (info.kind === 'protocol')
            return input && this.implementable(info)
              ? `Implements<${ref}> | SDKHandle`
              : 'SDKHandle'
          const count = info.genericParameters?.length ?? 0
          return (
            ref +
            (count
              ? `<${Array.from({ length: count }, (_, i) => (type.args[i] ? sub(type.args[i]) : 'unknown')).join(', ')}>`
              : '')
          )
        }
        if (mapped.ok) {
          if (mapped.ts.includes('Handle<')) {
            const paths = this.bridge.keyPaths(type, NO_GENERICS)
            return [...paths.map((p) => quote(p.name)), 'SDKHandle'].join(' | ')
          }
          return mapped.ts
        }
        return 'unknown'
      }
    }
  }
  concrete(e: E, type: SwiftType): SwiftType {
    return this.bridge.substitute(type, {
      ...NO_GENERICS,
      resolved: new Map(Object.entries(e.specialization ?? {})),
    })
  }
  result(e: E) {
    let result = e.returns ? this.type(this.concrete(e, e.returns)) : 'void'
    if (e.kind === 'init') {
      const info =
        e.receiver?.k === 'named'
          ? this.info(e.receiver)
          : this.infos.get(cleanOwner(e.owner ?? ''))
      result = e.receiver
        ? this.type(e.receiver)
        : info
          ? this.reference(info)
          : 'SDKHandle'
      const declaration =
        this.symbols
          .get(e.usr)
          ?.declarationFragments?.map((f) => f.spelling)
          .join('') ?? ''
      if (/\binit\?/.test(declaration)) result = `(${result}) | null`
    }
    const out = e.params.filter((p) => p.out || p.inout)
    if (!out.length) return result
    return `{ $ret: ${result === 'void' ? 'null' : result}; $out: { ${out.map((p) => `${quote(p.name)}: ${this.type(this.concrete(e, outPointee(p.type) ?? (p.type.k === 'inout' ? p.type.t : p.type)))}`).join('; ')} } }`
  }
  params(e: E) {
    const params = e.params.filter((p) => !p.out)
    const used = new Set<string>()
    return params.map((p, i) => {
      let name = parameterName(p.name, i)
      if (used.has(name)) name += i
      used.add(name)
      const optional =
        (p.hasDefault || p.optional) &&
        params.slice(i + 1).every((p) => p.hasDefault || p.optional)
      let type = this.type(this.concrete(e, p.type), true)
      if (p.keyPaths?.length) type = [...p.keyPaths.map(quote), 'SDKHandle'].join(' | ')
      return {
        name,
        declaration: `${name}${optional ? '?' : ''}: ${type}`,
        hint: this.hint(this.concrete(e, p.type)),
      }
    })
  }
  hint(type: SwiftType, depth = 0): WireHint | null {
    if (depth > 16) return null
    if (['optional', 'inout', 'existential'].includes(type.k))
      return this.hint((type as { t: SwiftType }).t, depth + 1)
    if (type.k === 'function')
      return {
        callback: { out: type.params.flatMap((p, i) => (callbackOut(p.t) ? [i] : [])) },
      }
    if (type.k === 'array' || type.k === 'variadic') {
      const hint = this.hint(type.t, depth + 1)
      return hint ? { array: hint } : null
    }
    if (type.k === 'dictionary') {
      const hint = this.hint(type.value, depth + 1)
      return hint ? { dictionary: hint } : null
    }
    if (type.k === 'named') {
      const info = this.info(type)
      const alias = info && this.alias(info)
      if (alias) return this.hint(alias, depth + 1)
      if (info?.kind === 'protocol' && this.implementable(info)) {
        this.usedProtocols.set(info.usr, info)
        return { protocol: info.usr }
      }
      const name = type.name.split('.').at(-1)
      if (
        ['Array', 'Set', 'ContiguousArray', 'Optional'].includes(name!) &&
        type.args[0]
      ) {
        const hint = this.hint(type.args[0], depth + 1)
        return hint && name !== 'Optional' ? { array: hint } : hint
      }
      if (name === 'Dictionary' && type.args[1]) {
        const hint = this.hint(type.args[1], depth + 1)
        return hint ? { dictionary: hint } : null
      }
    }
    return null
  }
  static(e: E) {
    const symbol = this.symbols.get(e.usr)
    return (
      e.kind === 'static' ||
      e.kind === 'init' ||
      (!!symbol &&
        (symbol.kind.identifier.startsWith('swift.type.') ||
          /\b(static|class)\s+(var|let|func)/.test(
            symbol.declarationFragments?.map((f) => f.spelling).join('') ?? ''
          )))
    )
  }
  valueOwner(e: E) {
    const info = e.owner && this.infos.get(cleanOwner(e.owner))
    return (
      !!info &&
      !!(
        (info.cases?.length && !info.payload) ||
        info.optionSet ||
        (info.rawValue && info.kind === 'struct')
      )
    )
  }
  valueSignature(e: E) {
    const name = this.names.get(e.key)!
    const result = this.result(e)
    const returned = e.isAsync || e.main ? `Promise<${result}>` : result
    const params = this.params(e).map((p) => p.declaration)
    if (this.static(e)) {
      if (e.kind === 'get') return `get ${name}(): ${returned}`
      if (e.kind === 'set' && !e.main && !e.isAsync)
        return `set ${name}(${params.map((p) => p.replace('?:', ':')).join(', ')})`
    } else {
      const info = this.infos.get(cleanOwner(e.owner!))!
      params.unshift(`$self: ${localName(info.path)}`)
    }
    const method =
      e.kind === 'get' ? `get${cap(name)}` : e.kind === 'set' ? `set${cap(name)}` : name
    return `${method}(${params.join(', ')}): ${returned}`
  }
  signature(e: E) {
    if (this.valueOwner(e)) return this.valueSignature(e)
    const name = this.names.get(e.key)!
    const result = this.result(e)
    const returned = e.isAsync || e.main ? `Promise<${result}>` : result
    if (e.kind === 'get') {
      if (!e.owner)
        return this.output.entries.some((s) => s.kind === 'set' && s.usr === e.usr)
          ? `${name}.value: ${returned}`
          : `const ${name}: ${returned}`
      return `${this.static(e) ? 'static ' : ''}get ${name}(): ${returned}`
    }
    if (e.kind === 'set' && !e.owner)
      return e.main || e.isAsync
        ? `${name}.setValue(${this.params(e)
            .map((p) => p.declaration)
            .join(', ')}): ${returned}`
        : `${name}.value: ${this.params(e)[0]?.declaration.split(': ').slice(1).join(': ') ?? 'unknown'}`
    if (e.kind === 'set' && !e.main && !e.isAsync)
      return `${this.static(e) ? 'static ' : ''}set ${name}(${this.params(e)
        .map((p) => p.declaration.replace('?:', ':'))
        .join(', ')})`
    return `${this.static(e) ? 'static ' : ''}${e.kind === 'set' ? `set${cap(name)}` : name}(${this.params(
      e
    )
      .map((p) => p.declaration)
      .join(', ')}): ${returned}`
  }
  invoke(e: E, self?: string) {
    const params = this.params(e)
    // out pointers occupy their swift argument slot even though callers supply no value.
    let at = 0
    const args = e.params.map((p) => (p.out ? 'null' : params[at++].name))
    at = 0
    const hints = e.params.map((p) => (p.out ? null : params[at++].hint))
    const sync = !!e.syncCallbacks
    const receiver = self ?? (e.owner && !this.static(e) ? 'this' : 'undefined')
    return `${e.isAsync || e.main ? 'callSDKAsync' : 'callSDK'}<${this.result(e)}>(${quote(this.output.table ?? this.output.module)}, ${e.id}, ${receiver}, [${args.join(', ')}]${hints.some(Boolean) || sync ? `, ${quote(hints)}` : ''}${sync ? ', true' : ''})`
  }
  jsdoc(usr: string) {
    const symbol = this.symbols.get(usr)
    if (!symbol) return ''
    const declaration =
      symbol.declarationFragments?.map((f) => f.spelling).join('') ?? symbol.names.title
    const availability =
      symbol.availability
        ?.filter((a) => a.domain === 'iOS')
        .flatMap((a) =>
          [
            a.introduced &&
              `@availability iOS ${a.introduced.major}.${a.introduced.minor ?? 0}+`,
            a.deprecated &&
              `@deprecated iOS ${a.deprecated.major}.${a.deprecated.minor ?? 0}`,
            a.isUnconditionallyDeprecated && '@deprecated',
          ].filter(Boolean)
        ) ?? []
    return `/**\n * ${[declaration, ...availability].join('\n * ').replace(/\*\//g, '* /')}\n */\n`
  }
  protocol(info: DeclarationInfo) {
    const members = new Map<string, Symbol>()
    const seen = new Set<string>()
    const collect = (owner: DeclarationInfo) => {
      if (seen.has(owner.usr)) return
      seen.add(owner.usr)
      const graph = this.source(owner.module)
      const symbols = new Map(graph?.symbols.map((s) => [s.identifier.precise, s]))
      for (const rel of graph?.relationships ?? []) {
        if (
          rel.source === owner.usr &&
          ['inheritsFrom', 'conformsTo'].includes(rel.kind)
        ) {
          const parent = this.bridge.index.get(rel.target)
          if (parent && parent.usr !== 'c:objc(pl)NSObject') collect(parent)
        }
        if (
          rel.target === owner.usr &&
          ['requirementOf', 'optionalRequirementOf'].includes(rel.kind)
        ) {
          const symbol = symbols.get(rel.source)
          if (symbol) members.set(rel.source, symbol)
        }
      }
    }
    collect(info)
    const methods: Record<string, string> = {}
    const declarations: string[] = []
    const signatures = new Map<
      string,
      { symbol: Symbol; params: string[][]; results: Set<string> }
    >()
    for (const symbol of members.values()) {
      if (!symbol.functionSignature) continue
      if (
        this.output.skipped.some(
          (s) => s.usr === `implementation:${info.usr}:${symbol.identifier.precise}`
        )
      )
        continue
      const title = symbol.pathComponents.at(-1)!
      const { base, labels } = splitTitle(title)
      let name = labelName(base, labels)
      if (methods[name] && methods[name] !== title) name += String(signatures.size)
      const params = (symbol.functionSignature.parameters ?? []).map((p) =>
        this.type(parameterType(p.declarationFragments))
      )
      const returns = symbol.functionSignature.returns
      const result = returns?.length ? this.type(parseType(returns), true) : 'void'
      methods[name] = title
      const signature = signatures.get(name) ?? {
        symbol,
        params: [],
        results: new Set<string>(),
      }
      signature.params.push(params)
      signature.results.add(result)
      signatures.set(name, signature)
    }
    for (const [name, signature] of signatures) {
      const params = signature.params[0]
        .map(
          (_, i) =>
            `arg${i}: ${[...new Set(signature.params.map((p) => p[i] ?? 'undefined'))].join(' | ')}`
        )
        .join(', ')
      declarations.push(
        `  ${this.jsdoc(signature.symbol.identifier.precise).replace(/\n/g, '\n  ')}${quote(name)}?: (${params}) => ${[...signature.results].join(' | ')};`
      )
    }
    return {
      declaration: `${this.jsdoc(info.usr)}export interface ${localName(info.path)} {\n${declarations.join('\n')}\n}`,
      registration: `registerSDKProtocol(${quote(info.usr)}, ${quote(methods)});`,
    }
  }
  emit() {
    const declarations: string[] = []
    const registrations: string[] = []
    const infos = [...this.bridge.index.values()].filter(
      (i) => i.module === this.output.module && i.kind !== 'associatedtype'
    )
    const owners = new Map<string, E[]>()
    for (const e of this.output.entries)
      if (e.owner) {
        const owner = cleanOwner(e.owner)
        owners.set(owner, [...(owners.get(owner) ?? []), e])
      }
    // extensions of foreign owners get a local wrapper without importing their runtime.
    for (const owner of owners.keys()) {
      const info = this.infos.get(owner)
      if (info && info.module !== this.output.module) infos.push(info)
    }
    const emitted = new Set<string>()
    for (const info of infos.sort((a, b) =>
      a.path.join('.').localeCompare(b.path.join('.'))
    )) {
      const name = localName(info.path)
      if (emitted.has(name)) continue
      emitted.add(name)
      const entries = owners.get(`${info.module}.${info.path.join('.')}`) ?? []
      if (info.kind === 'typealias') {
        const type: SwiftType = {
          k: 'named',
          name: `${info.module}.${info.path.join('.')}`,
          usr: info.usr,
          args: [],
        }
        const generics = info.genericParameters?.length
          ? `<${info.genericParameters.map((p) => `${identifier(p)} = unknown`).join(', ')}>`
          : ''
        declarations.push(
          `${this.jsdoc(info.usr)}export type ${name}${generics} = ${this.alias(info) ? this.type(type) : 'SDKHandle'};`
        )
        continue
      }
      const value =
        (info.cases?.length && !info.payload) ||
        info.optionSet ||
        (info.rawValue && info.kind === 'struct')
      if (value) {
        const values =
          info.cases?.length && !info.payload ? info.cases : (info.constants ?? [])
        const union = values.length
          ? values.map(quote).join(' | ')
          : (info.rawValue ?? 'string')
        declarations.push(
          `${this.jsdoc(info.usr)}export type ${name} = ${info.optionSet ? `Array<${union}>` : union};`
        )
        if (entries.length) {
          const members = entries.map((e) => {
            const setter = this.static(e) && e.kind === 'set' && !e.main && !e.isAsync
            return `  ${this.jsdoc(e.usr).replace(/\n/g, '\n  ')}${this.valueSignature(e)} { ${setter ? '' : 'return '}${this.invoke(e, this.static(e) ? 'undefined' : '$self')}; }`
          })
          declarations.push(`export const ${name} = {\n${members.join(',\n')}\n};`)
        }
        continue
      }
      if (info.kind === 'protocol') {
        const protocol = this.protocol(info)
        declarations.push(protocol.declaration)
        registrations.push(protocol.registration)
        continue
      }
      const generics = info.genericParameters?.length
        ? `<${info.genericParameters.map((p) => `${identifier(p)} = unknown`).join(', ')}>`
        : ''
      const inherited: E[] = []
      const inherit = (usr: string, visited = new Set<string>()) => {
        if (visited.has(usr)) return
        visited.add(usr)
        for (const rel of this.graph?.relationships ?? []) {
          if (rel.kind !== 'inheritsFrom' || rel.source !== usr) continue
          const parent = this.bridge.index.get(rel.target)
          if (parent?.module !== this.output.module) continue
          inherit(parent.usr, visited)
          inherited.push(
            ...(owners.get(`${parent.module}.${parent.path.join('.')}`) ?? []).filter(
              (e) => !this.static(e)
            )
          )
        }
      }
      inherit(info.usr)
      const ownNames = new Set(
        entries.map((e) => `${this.static(e)}:${this.names.get(e.key)}`)
      )
      const inheritedNames = new Set<string>()
      const inheritedEntries = inherited.reverse().filter((e) => {
        const key = `${this.static(e)}:${this.names.get(e.key)}`
        const accessor = `${key}:${e.kind}`
        if (ownNames.has(key) || inheritedNames.has(accessor)) return false
        inheritedNames.add(accessor)
        return true
      })
      const members = [...inheritedEntries, ...entries].map(
        (e) =>
          `  ${this.jsdoc(e.usr).replace(/\n/g, '\n  ')}${this.signature(e)} { ${e.kind === 'set' && !e.main && !e.isAsync ? '' : 'return '}${this.invoke(e)}; }`
      )
      declarations.push(
        `${this.jsdoc(info.usr)}export class ${name}${generics} extends SDKHandle {\n${members.join('\n')}\n}`
      )
      registrations.push(
        `registerSDKClass(${quote(`${info.module}.${info.path.join('.')}`)}, ${name});`
      )
    }
    // mutable globals expose live accessors; immutable globals and functions are named exports.
    const globals = this.output.entries.filter((e) => !e.owner)
    for (const e of globals.filter((e) => !['get', 'set'].includes(e.kind))) {
      declarations.push(
        `${this.jsdoc(e.usr)}export function ${this.signature(e)} { return ${this.invoke(e)}; }`
      )
    }
    for (const e of globals.filter((e) => e.kind === 'get')) {
      const setter = globals.find((s) => s.kind === 'set' && s.usr === e.usr)
      if (!setter)
        declarations.push(
          `${this.jsdoc(e.usr)}export ${this.signature(e)} = ${this.invoke(e)};`
        )
      else {
        const params = this.params(setter)
          .map((p) => p.declaration.replace('?:', ':'))
          .join(', ')
        const write =
          setter.main || setter.isAsync
            ? `setValue(${params}): Promise<void> { return ${this.invoke(setter)}; }`
            : `set value(${params}) { ${this.invoke(setter)}; }`
        declarations.push(
          `${this.jsdoc(e.usr)}export const ${this.names.get(e.key)} = {\n  get value(): ${e.main || e.isAsync ? `Promise<${this.result(e)}>` : this.result(e)} { return ${this.invoke(e)}; },\n  ${write}\n};`
        )
      }
    }
    for (const info of this.usedProtocols.values()) {
      if (info.module !== this.output.module)
        registrations.push(this.protocol(info).registration)
    }
    const imports = [...this.imports]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([module, names]) =>
          `import type { ${[...names].map(([name, alias]) => `${name} as ${alias}`).join(', ')} } from ${quote(`one/ios/${module}`)};`
      )
    return `// generated by packages/one/codegen/sdk/emit-ts.ts; do not edit\nimport { SDKHandle, callSDK, callSDKAsync, registerSDKClass, registerSDKProtocol, type Implements, type NativeOut, type NativeMap, type NativeError } from 'one/ios-runtime';\n${imports.join('\n')}\n\n${declarations.join('\n\n')}\n\n${registrations.join('\n')}\n`
  }
}

export function emitFacade(output: Output, bridge: Bridge): string {
  return new Facade(output, bridge).emit()
}

export function facadeCallFormatter(output: Output, bridge: Bridge) {
  const facade = new Facade(output, bridge)
  return (entry: E) => facade.signature(entry)
}
