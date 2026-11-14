// protocol witnesses retain javascript callbacks for the lifetime of the delegate.
import { inUniverse, type Bridge } from './bridge'
import { effectsOf, outputValue, type Skipped } from './emit'
import { loadGraph, type Fragment, type Graph, type Symbol } from './graph'
import { parameterType, parseType, type SwiftType, TypeParseError } from './types'

const text = (fragments: Fragment[] = []) => fragments.map((f) => f.spelling).join('')
const quoted = (name: string) => `\`${name.replace(/`/g, '')}\``
const SYNC_REASON = 'synchronous protocol result requires an active JS-thread call; delegate invocations can escape it'

// these standard-library markers have no method requirements. the compiler
// checks the generated witness against their concurrency semantics.
const MARKERS = new Set(['s:s8SendableP', 's:s16SendableMetatypeP'])

// stdlib and foundation values that cross into an objective-c method. character
// is a swift struct and does not. array, dictionary, set and optional are in
// this set, and objcRepresentable still requires every generic argument.
const BRIDGED_USRS = new Set([
  's:Sb', 's:Si', 's:Su', 's:Sd', 's:Sf', 's:SS', 's:Ss',
  's:s4Int8V', 's:s5Int16V', 's:s5Int32V', 's:s5Int64V',
  's:s5UInt8V', 's:s6UInt16V', 's:s6UInt32V', 's:s6UInt64V', 's:s7Float16V',
  's:14CoreFoundation7CGFloatV', 's:12CoreGraphics7CGFloatV',
  's:s5ErrorP', 's:s4Voida', 's:s8AnyClassa',
  's:10Foundation4DateV', 's:10Foundation3URLV', 's:10Foundation4DataV', 's:10Foundation4UUIDV',
  's:Sa', 's:SD', 's:Sh', 's:Sq',
])

// c:objc(pl)Name(im)archiver:didEncodeObject: — the selector is the objective-c
// requirement, which is not the selector swift infers from the swift name.
function objcMethod(usr: string): { selector: string; instance: boolean } | undefined {
  const match = /^c:objc\([^)]*\)[^(]*\((im|cm)\)([A-Za-z_][A-Za-z0-9_:]*)$/.exec(usr)
  if (!match) return undefined
  return { selector: match[2], instance: match[1] === 'im' }
}

// values that bridge to an objective-c object, so an optional of them is nullable.
// numbers and clang enums are selector-safe on their own and are not.
const REFERENCE_USRS = new Set([
  's:SS', 's:Ss',
  's:10Foundation4DateV', 's:10Foundation3URLV', 's:10Foundation4DataV', 's:10Foundation4UUIDV',
])

function clangEnum(usr: string | undefined): boolean {
  return !!usr && usr.includes('@E@')
}

function bridgesToObjC(usr: string, bridge: Bridge, seen: Set<string>, boxed: boolean): boolean {
  if (BRIDGED_USRS.has(usr) || usr.startsWith('c:')) return !(boxed && clangEnum(usr))
  if (seen.has(usr)) return false
  seen.add(usr)
  const info = bridge.index.get(usr)
  if (!info) return false
  if (info.conformsTo?.some((id) => bridge.index.get(id)?.path.at(-1) === 'ReferenceConvertible')) return true
  if (info.kind === 'typealias' && info.alias) return objcRepresentable(info.alias, bridge, seen, boxed)
  if (info.kind === 'class' && info.superclass) return bridgesToObjC(info.superclass, bridge, seen, boxed)
  return false
}

// a metatype is selector-safe only for an objective-c class. string.Type is not.
function objcClassType(type: SwiftType, bridge: Bridge, seen: Set<string>): boolean {
  if (type.k === 'existential') return objcClassType(type.t, bridge, seen)
  if (type.k !== 'named' || type.args.length > 0) return false
  const name = type.name.split('.').at(-1)!
  if (name === 'AnyObject' || name === 'AnyClass') return true
  if (!type.usr) return false
  if (type.usr.startsWith('c:objc(cs)') || type.usr.startsWith('c:objc(pl)')) return true
  const key = `class:${type.usr}`
  if (seen.has(key)) return false
  seen.add(key)
  const info = bridge.index.get(type.usr)
  if (!info || info.kind !== 'class' || !info.superclass) return false
  if (info.superclass.startsWith('c:objc(cs)')) return true
  return objcClassType({ k: 'named', name: '', usr: info.superclass, args: [] }, bridge, seen)
}

// optional bridges only when the wrapped value is an object. collections bridge
// to nsarray, nsset and nsdictionary, which are objects.
function objcOptional(type: SwiftType, bridge: Bridge, seen: Set<string>): boolean {
  switch (type.k) {
    case 'optional':
      return false
    case 'existential':
      return objcOptional(type.t, bridge, seen)
    case 'array':
    case 'dictionary':
      return objcRepresentable(type, bridge, seen)
    case 'function':
      if (type.throws || type.async) return false
      return type.params.every((param) => objcRepresentable(param.t, bridge, seen)) && objcRepresentable(type.result, bridge, seen)
    case 'metatype':
      return objcClassType(type.t, bridge, seen)
    case 'composition':
      return type.items.every((item) => objcOptional(item, bridge, seen))
    case 'named': {
      if (type.usr === 's:Sa' || type.usr === 's:Sh' || type.usr === 's:SD' || type.usr === 's:Sq') return objcRepresentable(type, bridge, seen)
      const name = type.name.split('.').at(-1)!
      if (name === 'Any' || name === 'AnyObject' || name === 'AnyClass' || name === 'Error') return true
      if (objcClassType(type, bridge, seen)) return true
      const info = type.usr ? bridge.index.get(type.usr) : undefined
      return !!type.usr && (REFERENCE_USRS.has(type.usr) || !!info?.conformsTo?.some((id) => bridge.index.get(id)?.path.at(-1) === 'ReferenceConvertible'))
    }
    default:
      return false
  }
}

function objcRepresentable(type: SwiftType, bridge: Bridge, seen = new Set<string>(), boxed = false): boolean {
  if (boxed && type.k === 'named' && clangEnum(type.usr)) return false
  switch (type.k) {
    case 'optional':
      // string? is a nullable object. [string?] is not an nsarray member.
      if (boxed) return false
      return objcOptional(type.t, bridge, seen)
    case 'array':
      return objcRepresentable(type.t, bridge, seen, true)
    case 'variadic':
      return false
    case 'dictionary':
      return objcRepresentable(type.key, bridge, seen, true) && objcRepresentable(type.value, bridge, seen, true)
    case 'existential':
      return objcRepresentable(type.t, bridge, seen, boxed)
    case 'composition':
      return type.items.every((item) => objcRepresentable(item, bridge, seen, boxed))
    case 'function':
      // a block is a parameter. an array or dictionary of blocks is not.
      if (boxed || type.throws || type.async) return false
      return type.params.every((param) => objcRepresentable(param.t, bridge, seen)) && objcRepresentable(type.result, bridge, seen)
    case 'tuple':
      return type.items.length === 0
    case 'inout':
      return false
    case 'metatype':
      return objcClassType(type.t, bridge, seen)
    case 'named': {
      if (type.usr === 's:Sq') return !boxed && type.args.length === 1 && objcOptional(type.args[0], bridge, seen)
      if (type.args.some((arg) => !objcRepresentable(arg, bridge, seen, true))) return false
      const name = type.name.split('.').at(-1)!
      if (name === 'Any' || name === 'AnyObject' || name === 'Void' || name === 'AnyClass') return true
      return !!type.usr && bridgesToObjC(type.usr, bridge, seen, boxed)
    }
  }
}

function asType(fragments: Fragment[], parameter: boolean): SwiftType | undefined {
  try {
    return parameter ? parameterType(fragments) : parseType(fragments)
  } catch (error) {
    if (error instanceof TypeParseError) return undefined
    throw error
  }
}

export function emitProtocols(graph: Graph, bridge: Bridge, all: Map<string, Symbol>, exclude: Map<string, string>, skipped: Skipped[]) {
  const graphs = new Map([[graph.module, graph]])
  const imports = new Set<string>()
  let protocolImports = new Set<string>()
  const getGraph = (module: string) => {
    if (!graphs.has(module)) {
      const loaded = loadGraph(module)
      if (loaded) graphs.set(module, loaded)
    }
    return graphs.get(module)
  }
  const qualify = (fragments: Fragment[]) => fragments.map((f, i) => {
    const info = f.preciseIdentifier && bridge.index.get(f.preciseIdentifier)
    if (info && f.kind === 'typeIdentifier' && !f.spelling.includes('.') && !text(fragments.slice(0, i)).endsWith('.')) {
      protocolImports.add(info.module)
      return `${info.module}.${info.path.map(quoted).join('.')}`
    }
    return f.spelling
  }).join('')
  const versionOf = (symbol: Symbol | undefined) => symbol?.availability?.find((a) => a.domain === 'iOS')?.introduced
  const newest = (a: ReturnType<typeof versionOf>, b: ReturnType<typeof versionOf>) =>
    !a || b && (b.major > a.major || b.major === a.major && (b.minor ?? 0) > (a.minor ?? 0)) ? b : a
  const nonescaping = (type: SwiftType) => type.k === 'function' && !type.escaping
  const blocks: string[] = []
  const protocols = new Map(graph.symbols.filter((s) => s.kind.identifier === 'swift.protocol').map((s) => [s.identifier.precise, s]))
  for (const [usr, symbol] of protocols) {
    if (!inUniverse(symbol, new Set())) continue
    const key = `implementation:${usr}`
    const path = `protocol implementation ${symbol.pathComponents.join('.')}`
    const drop = (reason: string) => skipped.push({ usr: key, path, reason })
    const info = bridge.index.get(usr)
    protocolImports = new Set()
    if (exclude.has(key)) { drop(exclude.get(key)!); continue }
    if (info?.associatedTypes) { drop('protocol with associated types'); continue }
    const requirements = new Map<string, { symbol: Symbol; optional: boolean }>()
    const visited = new Set<string>()
    let reason: string | undefined
    let classVersion = versionOf(symbol)
    const collect = (id: string) => {
      if (visited.has(id) || id === 'c:objc(pl)NSObject' || MARKERS.has(id)) return
      visited.add(id)
      const owner = bridge.index.get(id)
      classVersion = newest(classVersion, versionOf(all.get(id)))
      if (owner?.associatedTypes) { reason = 'protocol with associated types'; return }
      const source = owner ? getGraph(owner.module) : undefined
      if (!source) { reason = 'inherited protocol graph unavailable'; return }
      const symbols = new Map(source.symbols.map((s) => [s.identifier.precise, s]))
      for (const rel of source.relationships) {
        if (rel.source === id && (rel.kind === 'inheritsFrom' || rel.kind === 'conformsTo')) collect(rel.target)
        if (rel.target !== id || !['requirementOf', 'optionalRequirementOf'].includes(rel.kind)) continue
        const member = symbols.get(rel.source)
        if (member && inUniverse(member, new Set())) requirements.set(rel.source, { symbol: member, optional: rel.kind === 'optionalRequirementOf' })
      }
    }
    collect(usr)
    for (const requirement of requirements.values()) {
      if (!requirement.optional) classVersion = newest(classVersion, versionOf(requirement.symbol))
    }
    const objc = usr.startsWith('c:') && usr.includes('objc(pl)')
    const methods: string[] = []
    const selectors: string[] = []
    const required: string[] = []
    const accepted: string[] = []
    const name = `OneSDKImpl_${graph.module}_${symbol.pathComponents.join('_').replace(/[^a-zA-Z0-9_]/g, '_')}`
    for (const { symbol: requirement, optional } of requirements.values()) {
      const title = requirement.names.title
      const decl = text(requirement.declarationFragments)
      const returns = text(requirement.functionSignature?.returns).trim()
      const effects = effectsOf(decl)
      const awaitsReply = effects.isAsync && effects.throws
      let unsupported: string | undefined
      if (requirement.kind.identifier !== 'swift.method') unsupported = 'non-method protocol requirement'
      else if (returns && !['()', 'Void'].includes(returns) && !awaitsReply) unsupported = SYNC_REASON
      else if (requirement.swiftGenerics?.parameters?.length || /\b(Self|inout|rethrows)\b/.test(decl)) unsupported = 'generic or mutable protocol requirement'
      else if (effects.isAsync && !effects.throws) unsupported = 'async protocol requirement cannot propagate callback failure'
      else if (requirement.functionSignature?.parameters?.some((p) => nonescaping(bridge.functions(parameterType(p.declarationFragments))))) unsupported = 'nonescaping protocol callback cannot use the async dispatcher'
      const method = objc ? objcMethod(requirement.identifier.precise) : undefined
      if (!unsupported && method && !method.instance) unsupported = 'class protocol requirement'
      if (!unsupported && method) {
        const parameters = requirement.functionSignature?.parameters ?? []
        const result = !returns || ['()', 'Void'].includes(returns) ? null : asType(requirement.functionSignature?.returns ?? [], false)
        const representable = parameters.every((p) => {
          const type = asType(p.declarationFragments, true)
          return !!type && objcRepresentable(type, bridge)
        }) && (result === null || (!!result && objcRepresentable(result, bridge)))
        if (!representable) unsupported = 'not representable in Objective-C'
      }
      if (unsupported) {
        if (optional) skipped.push({ usr: `${key}:${requirement.identifier.precise}`, path: `${path}.${title}`, reason: unsupported })
        else reason = unsupported
        continue
      }
      const open = title.indexOf('(')
      const base = title.slice(0, open)
      const labels = title.slice(open + 1, -1).split(':').slice(0, -1)
      const params = requirement.functionSignature?.parameters ?? []
      const types: string[] = []
      const args = params.map((p, i) => {
        const fragments = qualify(p.declarationFragments)
        const type = fragments.slice(fragments.indexOf(':') + 1).trim().replace(/\s=\s.*$/s, '')
        types.push(type.replace(/^@escaping\s+/, ''))
        return `${labels[i] === '_' ? '_' : quoted(labels[i] ?? p.name)} p${i}: ${type}`
      })
      const values = params.map((p, i) => outputValue(bridge.functions(parameterType(p.declarationFragments)), `p${i}`))
      const methodVersion = newest(classVersion, versionOf(requirement))
      const available = methodVersion ? `@available(iOS ${methodVersion.major}.${methodVersion.minor ?? 0}, *)\n  ` : ''
      const result = returns && !['()', 'Void'].includes(returns) ? qualify(requirement.functionSignature!.returns) : undefined
      const suffix = `${effects.isAsync ? ' async' : ''}${effects.throws ? ' throws' : ''}${result ? ` -> ${result}` : ''}`
      const body = awaitsReply
        ? `guard let method = methods[${JSON.stringify(title)}] else { throw OneSDKError.unsupported("missing protocol method ${title}") }\n    ${result ? 'return try await method.resultAsync' : '_ = try await method.responseAsync'}([${values.join(', ')}])`
        : `methods[${JSON.stringify(title)}]?(${values.join(', ')})`
      const attribute = method ? `@objc(${method.selector}) ` : ''
      methods.push(`  ${available}${attribute}func ${quoted(base)}(${args.join(', ')})${suffix} {\n    ${body}\n  }`)
      accepted.push(title)
      if (!optional) {
        required.push(title)
        classVersion = newest(classVersion, versionOf(requirement))
      }
      // the typed witness reference disambiguates overloaded swift titles.
      if (method) {
        const reference = `${name}.${quoted(base)}${labels.length ? `(${labels.map((l) => `${l === '_' ? '_' : quoted(l)}:`).join('')})` : ''}`
        const selector = `#selector(${reference} as (${name}) -> (${types.join(', ')})${effects.isAsync ? ' async' : ''}${effects.throws ? ' throws' : ''} -> ${result ?? 'Void'})`
        const version = methodVersion
        const insert = `out[${selector}] = ${JSON.stringify(title)}`
        selectors.push(version ? `    if #available(iOS ${version.major}.${version.minor ?? 0}, *) { ${insert} }` : `    ${insert}`)
      }
    }
    if (info?.implementable === false && !reason) reason = 'protocol bridge index is not implementable'
    if (reason) { drop(reason); continue }
    for (const module of protocolImports) imports.add(module)
    const factoryName = `OneSDKFactory_${Buffer.from(usr).toString('hex')}`
    const type = `${graph.module}.${symbol.pathComponents.map(quoted).join('.')}`
    const available = classVersion ? `@available(iOS ${classVersion.major}.${classVersion.minor ?? 0}, *)\n` : ''
    blocks.push(`// implementation ${key}
${available}final class ${name}: ${objc ? 'NSObject, ' : ''}${type} {
  private let methods: [String: OneSDKFunction]
  init(_ methods: [String: OneSDKFunction]) { self.methods = methods${objc ? '; super.init()' : ''} }
${methods.join('\n')}
${objc ? `  private static let selectors: [Selector: String] = {
    var out: [Selector: String] = [:]
${selectors.join('\n')}
    return out
  }()
  override func responds(to selector: Selector!) -> Bool {
    if let title = Self.selectors[selector] { return methods[title] != nil }
    return super.responds(to: selector)
  }` : ''}
}
@objc(${factoryName}) final class ${factoryName}: NSObject, OneSDKImplementationFactory {
  static func make(_ methods: [String: OneSDKFunction]) throws -> Any {
    ${(() => {
      const v = classVersion
      return v ? `guard #available(iOS ${v.major}.${v.minor ?? 0}, *) else { throw OneSDKError.unsupported("${type} before iOS ${v.major}.${v.minor ?? 0}") }` : ''
    })()}
    try OneSDKImplementations.validate(methods, required: ${JSON.stringify(required)}, accepted: ${JSON.stringify(accepted)})
    return ${name}(methods)
  }
}
// end implementation`)
  }
  return [...imports].filter((m) => m !== graph.module && m !== 'Foundation').sort().map((m) => `import ${m}`).join('\n') + '\n\n' + blocks.join('\n\n')
}
