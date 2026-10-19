// protocol witnesses retain javascript callbacks for the lifetime of the delegate.
import { inUniverse, type Bridge } from './bridge'
import { effectsOf, outputValue, type Skipped } from './emit'
import { loadGraph, type Fragment, type Graph, type Symbol } from './graph'
import { parameterType, type SwiftType } from './types'

const text = (fragments: Fragment[] = []) => fragments.map((f) => f.spelling).join('')
const quoted = (name: string) => `\`${name.replace(/`/g, '')}\``
const SYNC_REASON = 'synchronous protocol result requires an active JS-thread call; delegate invocations can escape it'

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
      if (visited.has(id) || id === 'c:objc(pl)NSObject') return
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
      methods.push(`  ${available}func ${quoted(base)}(${args.join(', ')})${suffix} {\n    ${body}\n  }`)
      accepted.push(title)
      if (!optional) {
        required.push(title)
        classVersion = newest(classVersion, versionOf(requirement))
      }
      // the typed witness reference disambiguates overloaded swift titles.
      if (objc) {
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
