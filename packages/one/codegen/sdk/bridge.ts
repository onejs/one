// decides how every public sdk declaration crosses to typescript. a value with a
// plain javascript form crosses as that value; everything else crosses as a
// handle that keeps the native value alive. a declaration that cannot cross
// says why, so coverage lists its reason instead of dropping it.
import type { Graph, Symbol } from './graph'
import { parameterType, parseType, type SwiftType, TypeParseError } from './types'

export type DeclarationInfo = {
  usr: string
  module: string
  path: string[]
  kind: string
  // enum: case names, with whether any case carries a payload
  cases?: string[]
  payload?: boolean
  // struct wrapping a string or number raw value (objective-c typed constants)
  rawValue?: 'string' | 'number'
  optionSet?: boolean
  // static members a raw value or option set offers as named values
  constants?: string[]
  // protocol: whether javascript can implement it (void requirements only)
  implementable?: boolean
  associatedTypes?: boolean
}

export type Index = Map<string, DeclarationInfo>

const TYPE_KINDS = new Set(['swift.class', 'swift.struct', 'swift.enum', 'swift.protocol', 'swift.typealias', 'swift.actor', 'swift.associatedtype'])

// the stdlib and foundation types with a plain javascript form
const VALUES: Record<string, string> = {
  's:Sb': 'boolean',
  's:Si': 'number', 's:Su': 'number', 's:Sd': 'number', 's:Sf': 'number',
  's:s4Int8V': 'number', 's:s5Int16V': 'number', 's:s5Int32V': 'number', 's:s5Int64V': 'number',
  's:s5UInt8V': 'number', 's:s6UInt16V': 'number', 's:s6UInt32V': 'number', 's:s6UInt64V': 'number',
  's:s7Float16V': 'number', 's:14CoreFoundation7CGFloatV': 'number', 's:12CoreGraphics7CGFloatV': 'number',
  'c:@T@NSTimeInterval': 'number', 'c:@T@NSInteger': 'number', 'c:@T@NSUInteger': 'number',
  's:SS': 'string', 's:SJ': 'string', 's:Ss': 'string',
  's:10Foundation4DateV': 'Date',
  's:10Foundation3URLV': 'string',
  's:10Foundation4DataV': 'ArrayBuffer',
  's:10Foundation4UUIDV': 'string',
  's:s4Voida': 'void', 's:s5NeverO': 'never',
  's:s5ErrorP': 'NativeError',
  'c:@S@CGPoint': '{ x: number; y: number }',
  'c:@S@CGSize': '{ width: number; height: number }',
  'c:@S@CGRect': '{ x: number; y: number; width: number; height: number }',
  'c:@S@CGVector': '{ dx: number; dy: number }',
  'c:@S@_NSRange': '{ location: number; length: number }',
  'c:@S@UIEdgeInsets': '{ top: number; left: number; bottom: number; right: number }',
  'c:@S@NSDirectionalEdgeInsets': '{ top: number; leading: number; bottom: number; trailing: number }',
  'c:@S@CLLocationCoordinate2D': '{ latitude: number; longitude: number }',
}
const VALUE_NAMES: Record<string, string> = {
  Bool: 's:Sb', Int: 's:Si', UInt: 's:Su', Double: 's:Sd', Float: 's:Sf', String: 's:SS',
  Void: 's:s4Voida', Never: 's:s5NeverO', Error: 's:s5ErrorP', CGFloat: 's:14CoreFoundation7CGFloatV',
  TimeInterval: 'c:@T@NSTimeInterval', Date: 's:10Foundation4DateV', URL: 's:10Foundation3URLV',
  Data: 's:10Foundation4DataV', UUID: 's:10Foundation4UUIDV', Character: 's:SJ', Substring: 's:Ss',
}
const POINTERS = /^(Unsafe(Mutable)?(Raw)?(Buffer)?Pointer|OpaquePointer|AutoreleasingUnsafeMutablePointer|CVaListPointer)$/
const UNBRIDGEABLE_NAMES: Record<string, string> = {
  Selector: 'selector', AnyClass: 'metatype', Protocol: 'metatype', NSZone: 'pointer',
  ObjectIdentifier: 'identity', Hasher: 'hashing', AnyKeyPath: 'key path', PartialKeyPath: 'key path',
  KeyPath: 'key path', WritableKeyPath: 'key path', ReferenceWritableKeyPath: 'key path',
}

// the facts about one graph the index needs, small enough to keep for the
// whole sdk while each graph is read once.
export type IndexFacts = {
  declarations: DeclarationInfo[]
  members: { owner: string; kind: 'case' | 'payloadCase' | 'rawValue' | 'constant'; name: string; raw?: 'string' | 'number' }[]
  optionSets: string[]
  requirements: { owner: string; blocks: boolean; associated: boolean }[]
}

export function collectFacts(graph: Graph): IndexFacts {
  const facts: IndexFacts = { declarations: [], members: [], optionSets: [], requirements: [] }
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]))
  for (const symbol of graph.symbols) {
    if (!TYPE_KINDS.has(symbol.kind.identifier)) continue
    facts.declarations.push({
      usr: symbol.identifier.precise,
      module: graph.module,
      path: symbol.pathComponents,
      kind: symbol.kind.identifier.slice('swift.'.length),
    })
  }
  for (const rel of graph.relationships) {
    if (rel.kind === 'conformsTo' && rel.target === 's:s9OptionSetP') facts.optionSets.push(rel.source)
    const member = byUsr.get(rel.source)
    if (!member) continue
    const name = member.pathComponents.at(-1)!
    const kind = member.kind.identifier
    if (rel.kind === 'memberOf') {
      if (kind === 'swift.enum.case') {
        const payload = (member.declarationFragments ?? []).some((f) => f.spelling.includes('('))
        facts.members.push({ owner: rel.target, kind: payload ? 'payloadCase' : 'case', name })
      } else if (kind === 'swift.property' && name === 'rawValue') {
        const type = member.declarationFragments?.find((f) => f.kind === 'typeIdentifier')
        facts.members.push({ owner: rel.target, kind: 'rawValue', name, raw: type?.preciseIdentifier === 's:SS' ? 'string' : 'number' })
      } else if (kind === 'swift.type.property' &&
        member.declarationFragments?.some((f) => f.kind === 'typeIdentifier' && f.preciseIdentifier === rel.target)) {
        facts.members.push({ owner: rel.target, kind: 'constant', name })
      }
    }
    if (rel.kind === 'requirementOf' || rel.kind === 'optionalRequirementOf') {
      const returns = member.functionSignature?.returns ?? []
      const returnsVoid = !returns.length || ['()', 'Void'].includes(returns.map((f) => f.spelling).join('').trim())
      // a required member javascript cannot answer synchronously rules the protocol out
      facts.requirements.push({
        owner: rel.target,
        associated: kind === 'swift.associatedtype',
        blocks: rel.kind === 'requirementOf' && (kind !== 'swift.method' || !returnsVoid),
      })
    }
  }
  return facts
}

export function buildIndex(all: IndexFacts[]): Index {
  const index: Index = new Map()
  for (const facts of all) for (const d of facts.declarations) index.set(d.usr, d)
  for (const facts of all) {
    for (const usr of facts.optionSets) {
      const info = index.get(usr)
      if (info) info.optionSet = true
    }
    for (const m of facts.members) {
      const owner = index.get(m.owner)
      if (!owner) continue
      if (m.kind === 'case' || m.kind === 'payloadCase') {
        owner.cases = [...(owner.cases ?? []), m.name]
        if (m.kind === 'payloadCase') owner.payload = true
      } else if (m.kind === 'rawValue') owner.rawValue = m.raw
      else owner.constants = [...(owner.constants ?? []), m.name]
    }
    for (const r of facts.requirements) {
      const owner = index.get(r.owner)
      if (!owner) continue
      if (r.associated) owner.associatedTypes = true
      owner.implementable = (owner.implementable ?? true) && !r.blocks
    }
  }
  return index
}

export type Bridged = { ok: true; ts: string } | { ok: false; reason: string }

type Position = 'input' | 'output'

export class Bridge {
  constructor(readonly index: Index) {}

  type(type: SwiftType, position: Position, generics: Set<string>): Bridged {
    switch (type.k) {
      case 'optional': {
        const inner = this.type(type.t, position, generics)
        return inner.ok ? { ok: true, ts: `${inner.ts} | null` } : inner
      }
      case 'array':
      case 'variadic': {
        const inner = this.type(type.t, position, generics)
        return inner.ok ? { ok: true, ts: `${wrap(inner.ts)}[]` } : inner
      }
      case 'dictionary': {
        const key = this.type(type.key, position, generics)
        if (!key.ok) return key
        if (key.ts !== 'string' && key.ts !== 'number' && !/^'/.test(key.ts)) {
          return { ok: true, ts: `NativeMap<${key.ts}, ${this.must(type.value, position, generics)}>` }
        }
        const value = this.type(type.value, position, generics)
        return value.ok ? { ok: true, ts: `Record<${key.ts}, ${value.ts}>` } : value
      }
      case 'tuple': {
        if (!type.items.length) return { ok: true, ts: 'void' }
        const items = type.items.map((item) => ({ label: item.label, b: this.type(item.t, position, generics) }))
        const bad = items.find((item) => !item.b.ok)
        if (bad) return bad.b
        return {
          ok: true,
          ts: items.every((item) => item.label)
            ? `{ ${items.map((item) => `${item.label}: ${(item.b as { ts: string }).ts}`).join('; ')} }`
            : `[${items.map((item) => (item.b as { ts: string }).ts).join(', ')}]`,
        }
      }
      case 'function':
        return this.callback(type, position, generics)
      case 'existential':
        return this.protocolType(type.t, position, generics)
      case 'composition': {
        const items = type.items.map((item) => this.protocolType(item, position, generics))
        const bad = items.find((item) => !item.ok)
        return bad ?? { ok: true, ts: items.map((item) => (item as { ts: string }).ts).join(' & ') }
      }
      case 'inout':
        return { ok: false, reason: 'inout' }
      case 'metatype':
        return { ok: false, reason: 'metatype' }
      case 'named':
        return this.named(type, position, generics)
    }
  }

  must(type: SwiftType, position: Position, generics: Set<string>) {
    const b = this.type(type, position, generics)
    return b.ok ? b.ts : 'unknown'
  }

  named(type: Extract<SwiftType, { k: 'named' }>, position: Position, generics: Set<string>): Bridged {
    const last = type.name.split('.').at(-1)!
    if (/^(each|repeat) /.test(type.name)) return { ok: false, reason: 'parameter pack' }
    if (generics.has(type.name) || generics.has(type.name.split('.')[0]) || type.name === 'Self' || type.name.startsWith('Self.')) {
      return { ok: false, reason: 'generic' }
    }
    if (POINTERS.test(last)) return { ok: false, reason: 'pointer' }
    if (UNBRIDGEABLE_NAMES[last]) return { ok: false, reason: UNBRIDGEABLE_NAMES[last] }
    const usr = type.usr ?? VALUE_NAMES[type.name]
    if (usr && VALUES[usr]) return { ok: true, ts: VALUES[usr] }
    if (type.name === 'Any' || type.name === 'AnyObject' || type.name === 'AnyHashable') {
      return { ok: true, ts: 'unknown' }
    }
    // Optional<T>, Array<T>, Set<T>, Dictionary<K, V> spelled out
    if (usr === 's:Sq' || type.name === 'Optional') return this.type({ k: 'optional', t: type.args[0], implicit: false }, position, generics)
    if (usr === 's:Sa' || usr === 's:Sh' || type.name === 'Array' || type.name === 'Set' || type.name === 'ContiguousArray') {
      return type.args[0] ? this.type({ k: 'array', t: type.args[0] }, position, generics) : { ok: false, reason: 'generic' }
    }
    if (usr === 's:SD' || type.name === 'Dictionary') {
      return type.args.length === 2 ? this.type({ k: 'dictionary', key: type.args[0], value: type.args[1] }, position, generics) : { ok: false, reason: 'generic' }
    }
    if (type.name === 'InlineArray' && type.args.length === 2) {
      return this.type({ k: 'array', t: type.args[1] }, position, generics)
    }
    for (const arg of type.args) {
      const b = this.type(arg, position, generics)
      if (!b.ok) return b
    }
    const info = usr ? this.index.get(usr) : undefined
    const name = tsName(info ? `${info.module}.${info.path.join('.')}` : type.name)
    if (info?.kind === 'enum' && info.cases?.length && !info.payload) {
      return { ok: true, ts: info.cases.map((c) => `'${c}'`).join(' | ') }
    }
    if (info?.optionSet) {
      return { ok: true, ts: info.constants?.length ? `(${info.constants.map((c) => `'${c}'`).join(' | ')})[]` : 'string[]' }
    }
    if (info?.rawValue && info.kind === 'struct') {
      return { ok: true, ts: info.constants?.length ? info.constants.map((c) => `'${c}'`).join(' | ') : info.rawValue }
    }
    if (info?.kind === 'protocol') return this.protocolType(type, position, generics)
    if (info?.kind === 'associatedtype') return { ok: false, reason: 'generic' }
    // a class, actor, struct or payload enum crosses as a handle to the native value
    return { ok: true, ts: `Handle<'${name}'>` }
  }

  protocolType(type: SwiftType, position: Position, generics: Set<string>): Bridged {
    if (type.k !== 'named') return this.type(type, position, generics)
    const info = type.usr ? this.index.get(type.usr) : undefined
    if (type.name === 'Error' || type.usr === 's:s5ErrorP') return { ok: true, ts: 'NativeError' }
    if (type.name === 'AnyObject' || type.name === 'Any') return { ok: true, ts: 'unknown' }
    if (generics.has(type.name)) return { ok: false, reason: 'generic' }
    const name = tsName(info ? `${info.module}.${info.path.join('.')}` : type.name)
    if (info?.associatedTypes) return { ok: false, reason: 'protocol with associated types' }
    if (position === 'input') {
      // javascript passes an object that implements the protocol, or a handle
      // to a native value that already conforms
      return info?.implementable === false
        ? { ok: true, ts: `Handle<'${name}'>` }
        : { ok: true, ts: `Implements<'${name}'> | Handle<'${name}'>` }
    }
    return { ok: true, ts: `Handle<'${name}'>` }
  }

  callback(type: Extract<SwiftType, { k: 'function' }>, position: Position, generics: Set<string>): Bridged {
    // a closure javascript passes in is called later with native values; a
    // closure native code hands back is called from javascript with values
    const argPosition: Position = position === 'input' ? 'output' : 'input'
    const resultPosition: Position = position === 'input' ? 'input' : 'output'
    const params = type.params.map((p) => this.type(p.t, argPosition, generics))
    const bad = params.find((p) => !p.ok)
    if (bad) return bad
    const result = this.type(type.result, resultPosition, generics)
    if (!result.ok) return result
    if (position === 'input' && result.ts !== 'void' && !type.async) {
      return { ok: false, reason: 'callback returns a value synchronously' }
    }
    const args = params.map((p, i) => `a${i}: ${(p as { ts: string }).ts}`).join(', ')
    return { ok: true, ts: `(${args}) => ${type.async || position === 'output' ? `Promise<${result.ts}>` : result.ts}` }
  }
}

function wrap(ts: string) {
  return /[|&]/.test(ts) && !/^Handle</.test(ts) ? `(${ts})` : ts
}

export function tsName(qualified: string) {
  return qualified.replace(/[^A-Za-z0-9_.]/g, '_')
}

export type Verdict = { covered: true } | { covered: false; reason: string }

const SKIP_NAMES = new Set(['hash(into:)', 'hashValue', 'init(from:)', 'encode(to:)'])

// whether a symbol belongs to the universe coverage counts: public, available on
// ios, not underscored, not an operator, not a protocol's own requirement.
export function inUniverse(symbol: Symbol, requirementUsrs: Set<string>): boolean {
  if (symbol.accessLevel !== 'public' && symbol.accessLevel !== 'open') return false
  // a protocol's default implementation copied onto each conforming type counts once, on the protocol
  if (symbol.identifier.precise.includes('::SYNTHESIZED::')) return false
  if (symbol.kind.identifier === 'swift.func.op' || symbol.kind.identifier === 'swift.macro') return false
  if (symbol.pathComponents.some((p) => p.startsWith('_'))) return false
  if (SKIP_NAMES.has(symbol.pathComponents.at(-1)!)) return false
  if (requirementUsrs.has(symbol.identifier.precise)) return false
  const ios = symbol.availability?.find((a) => a.domain === 'iOS')
  if (ios?.isUnconditionallyUnavailable || ios?.obsoleted) return false
  const anyUnavailable = symbol.availability?.find((a) => a.domain === '*' && a.isUnconditionallyUnavailable)
  if (anyUnavailable) return false
  // a symbol available only on other platforms
  if (symbol.availability?.length && !ios && symbol.availability.every((a) => a.domain !== '*' && a.domain !== 'iOS' && a.domain !== 'iPadOS' && a.domain !== 'macCatalyst' && !a.domain.startsWith('Swift'))) return false
  return true
}

export function genericsOf(symbol: Symbol, owner?: Symbol): Set<string> {
  return new Set([
    ...(symbol.swiftGenerics?.parameters ?? []).map((p) => p.name),
    ...(owner?.swiftGenerics?.parameters ?? []).map((p) => p.name),
  ])
}

export function judge(bridge: Bridge, symbol: Symbol, owner: Symbol | undefined): Verdict {
  const kind = symbol.kind.identifier
  const generics = genericsOf(symbol, owner)
  try {
    if (kind === 'swift.class' || kind === 'swift.struct' || kind === 'swift.actor') return { covered: true }
    if (kind === 'swift.enum') return { covered: true }
    if (kind === 'swift.protocol') {
      const info = bridge.index.get(symbol.identifier.precise)
      return info?.associatedTypes ? { covered: false, reason: 'protocol with associated types' } : { covered: true }
    }
    if (kind === 'swift.associatedtype') return { covered: false, reason: 'generic' }
    if (kind === 'swift.typealias') {
      const fragments = symbol.declarationFragments ?? []
      const eq = fragments.findIndex((f) => f.kind === 'text' && f.spelling.includes('='))
      if (eq < 0) return { covered: true }
      const head = fragments[eq]
      const rest = [{ ...head, spelling: head.spelling.slice(head.spelling.indexOf('=') + 1) }, ...fragments.slice(eq + 1)]
      if (symbol.swiftGenerics?.parameters?.length) return { covered: false, reason: 'generic' }
      const b = bridge.type(parseType(rest), 'output', generics)
      return b.ok ? { covered: true } : { covered: false, reason: b.reason }
    }
    if (kind === 'swift.enum.case') return { covered: true }
    if (kind === 'swift.property' || kind === 'swift.type.property' || kind === 'swift.var') {
      const fragments = symbol.declarationFragments ?? []
      // the type follows the colon after the property's name, past any attributes
      const name = fragments.findIndex((f) => f.kind === 'identifier')
      const colon = fragments.findIndex((f, i) => i > name && f.kind === 'text' && f.spelling.includes(':'))
      if (colon < 0) return { covered: true }
      const head = fragments[colon]
      const body = [{ ...head, spelling: head.spelling.slice(head.spelling.indexOf(':') + 1) }, ...fragments.slice(colon + 1)]
      const brace = body.findIndex((f) => f.kind === 'text' && /[{=]/.test(f.spelling))
      const typeFragments = brace < 0 ? body : [...body.slice(0, brace), { ...body[brace], spelling: body[brace].spelling.split(/[{=]/)[0] }]
      const b = bridge.type(parseType(typeFragments), 'output', generics)
      return b.ok ? { covered: true } : { covered: false, reason: b.reason }
    }
    if (kind === 'swift.method' || kind === 'swift.type.method' || kind === 'swift.func' ||
      kind === 'swift.init' || kind === 'swift.subscript' || kind === 'swift.type.subscript') {
      const signature = symbol.functionSignature
      for (const parameter of signature?.parameters ?? []) {
        const b = bridge.type(parameterType(parameter.declarationFragments), 'input', generics)
        if (!b.ok) return { covered: false, reason: b.reason }
      }
      if (signature?.returns?.length && kind !== 'swift.init') {
        const text = signature.returns.map((f) => f.spelling).join('').trim()
        if (text && text !== '()' && text !== 'Void') {
          const b = bridge.type(parseType(signature.returns), 'output', generics)
          if (!b.ok) return { covered: false, reason: b.reason }
        }
      }
      return { covered: true }
    }
    return { covered: false, reason: `kind ${kind}` }
  } catch (error) {
    if (error instanceof TypeParseError) {
      if (process.env.SDK_PARSE_DEBUG) console.error(symbol.pathComponents.join('.'), error.message)
      return { covered: false, reason: 'unparsed type' }
    }
    throw error
  }
}
