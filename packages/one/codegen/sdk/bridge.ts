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
  // typealias: the type it names, when it has no generic parameters
  alias?: SwiftType
}

export type Index = Map<string, DeclarationInfo>

// a generic requirement as the symbol graph spells it: `T: Protocol`, `T == Type` or `T: Superclass`.
// `lhs` is a parameter or a member path like `T.Element`.
type Constraint = { kind: 'conformance' | 'sameType' | 'superclass'; lhs: string; rhs: string; rhsPrecise?: string }
const constraintsOf = (symbol?: Symbol) => (symbol?.swiftGenerics?.constraints ?? []) as Constraint[]

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
// objective-c and darwin booleans cross as booleans
const BOOLEAN_NAMES = new Set(['ObjCBool', 'DarwinBoolean', 'CBool'])

// the value a pointer parameter only receives: an optional, a flag or an autoreleased object
// native code writes through. javascript passes nothing and reads the written value back from
// the call's result
export function outPointee(type: SwiftType): SwiftType | undefined {
  const pointer = type.k === 'optional' ? type.t : type
  if (pointer.k !== 'named') return undefined
  const name = pointer.name.split('.').at(-1)!
  const element = pointer.args[0]
  if (!element || (name !== 'AutoreleasingUnsafeMutablePointer' && name !== 'UnsafeMutablePointer')) return undefined
  if (name === 'AutoreleasingUnsafeMutablePointer' || element.k === 'optional') return element
  return element.k === 'named' && BOOLEAN_NAMES.has(element.name.split('.').at(-1)!) ? element : undefined
}
// the c typealiases of the swift standard library, which no sdk framework declares
const C_ALIASES: Record<string, string> = {
  CChar: 'Int8', CSignedChar: 'Int8', CUnsignedChar: 'UInt8', CShort: 'Int16', CUnsignedShort: 'UInt16',
  CInt: 'Int32', CUnsignedInt: 'UInt32', CLong: 'Int', CUnsignedLong: 'UInt', CLongLong: 'Int64',
  CUnsignedLongLong: 'UInt64', CFloat: 'Float', CDouble: 'Double', CWideChar: 'Int32', CChar16: 'UInt16', CChar32: 'UInt32',
  OSStatus: 'Int32',
}
// a pointer to one of these scalars crosses as the typed array holding them
const TYPED_ARRAYS: Record<string, string> = {
  Int8: 'Int8Array', UInt8: 'Uint8Array', Int16: 'Int16Array', UInt16: 'Uint16Array',
  Int32: 'Int32Array', UInt32: 'Uint32Array', Int64: 'BigInt64Array', Int: 'BigInt64Array',
  UInt64: 'BigUint64Array', UInt: 'BigUint64Array', Float: 'Float32Array', Double: 'Float64Array', CGFloat: 'Float64Array',
}
const POINTERS = /^(Unsafe(Mutable)?(Raw)?(Buffer)?Pointer|OpaquePointer|AutoreleasingUnsafeMutablePointer|CVaListPointer)$/
const UNBRIDGEABLE_NAMES: Record<string, string> = {
  Selector: 'selector', NSZone: 'pointer',
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
      alias: symbol.kind.identifier === 'swift.typealias' ? aliasTarget(symbol) : undefined,
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

// how a declaration's generic parameters resolve. `resolved` holds the type a parameter, or a
// member like `T.Element`, specializes to; `classes` are the ones a superclass constraint
// pins; `owned` are the owner's or alias's own parameters, which a handle may keep as type
// arguments.
export type Generics = {
  params: Set<string>
  resolved: Map<string, SwiftType>
  classes: Set<string>
  owned: Set<string>
}
export const NO_GENERICS: Generics = { params: new Set(), resolved: new Map(), classes: new Set(), owned: new Set() }

// the protocols whose conformers are all an array of one element type, or one number, string or
// byte sequence; a parameter constrained to these and nothing else takes that one type.
const COLLECTIONS = new Set(['Sequence', 'Collection', 'BidirectionalCollection', 'RandomAccessCollection', 'MutableCollection', 'RangeReplaceableCollection', 'AccelerateBuffer', 'AccelerateMutableBuffer'])
const INTEGERS = new Set(['BinaryInteger', 'FixedWidthInteger', 'SignedInteger', 'UnsignedInteger'])
const FLOATS = new Set(['BinaryFloatingPoint', 'FloatingPoint'])
// conformances every standard value type has, so they never rule a specialization out
const PASSIVE = new Set(['Sendable', 'Equatable', 'Hashable', 'Codable', 'Decodable', 'Encodable', 'CustomStringConvertible', 'Plottable'])
const NUMERIC = new Set([...PASSIVE, 'Comparable', 'Numeric', 'SignedNumeric', 'AdditiveArithmetic', 'Strideable', 'SIMDScalar', 'ExpressibleByIntegerLiteral'])
const INTEGER_OK = new Set([...NUMERIC, ...INTEGERS, 'ExpressibleByIntegerLiteral'])
const FLOAT_OK = new Set([...NUMERIC, ...FLOATS, 'ExpressibleByFloatLiteral', 'MLShapedArrayScalar'])
const STRING_OK = new Set([...PASSIVE, 'StringProtocol', 'Comparable', 'ExpressibleByStringLiteral'])
const DATA_PROTOCOLS = new Set(['DataProtocol', 'MutableDataProtocol', 'ContiguousBytes'])
const DATA_OK = new Set([...PASSIVE, ...DATA_PROTOCOLS])
// a protocol swift ships a type eraser for: the eraser conforms, so a generic constrained to it
// alone takes the erased value
const ERASERS: Record<string, string> = {
  View: 'SwiftUI.AnyView', ShapeStyle: 'SwiftUI.AnyShapeStyle', Shape: 'SwiftUI.AnyShape', Layout: 'SwiftUI.AnyLayout',
}

export class Bridge {
  private aliasDepth = 0
  constructor(readonly index: Index) {}

  type(type: SwiftType, position: Position, generics: Generics): Bridged {
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
        return this.metatype(type.t, generics)
      case 'named':
        return this.named(type, position, generics)
    }
  }

  must(type: SwiftType, position: Position, generics: Generics) {
    const b = this.type(type, position, generics)
    return b.ok ? b.ts : 'unknown'
  }

  named(type: Extract<SwiftType, { k: 'named' }>, position: Position, generics: Generics): Bridged {
    const last = type.name.split('.').at(-1)!
    if (/^(each|repeat) /.test(type.name)) return { ok: false, reason: 'parameter pack' }
    const generic = this.generic(type.name, position, generics)
    if (generic) return generic
    if (POINTERS.test(last)) return this.pointer(type, position, generics)
    if (last === 'AnyClass' || last === 'Protocol') return { ok: true, ts: 'string' }
    if (BOOLEAN_NAMES.has(last)) return { ok: true, ts: 'boolean' }
    if (C_ALIASES[last] && !this.index.has(type.usr ?? '')) return { ok: true, ts: 'number' }
    if (UNBRIDGEABLE_NAMES[last]) return { ok: false, reason: UNBRIDGEABLE_NAMES[last] }
    const usr = type.usr ?? VALUE_NAMES[type.name]
    if (usr && VALUES[usr]) return { ok: true, ts: VALUES[usr] }
    if (type.name === 'Any' || type.name === 'AnyObject' || type.name === 'AnyHashable') {
      return { ok: true, ts: 'unknown' }
    }
    // Optional<T>, Array<T>, Set<T>, Dictionary<K, V> spelled out
    if (usr === 's:Sq' || type.name === 'Optional') {
      return type.args[0] ? this.type({ k: 'optional', t: type.args[0], implicit: false }, position, generics) : { ok: false, reason: 'generic' }
    }
    if (usr === 's:Sa' || usr === 's:Sh' || type.name === 'Array' || type.name === 'Set' || type.name === 'ContiguousArray') {
      return type.args[0] ? this.type({ k: 'array', t: type.args[0] }, position, generics) : { ok: false, reason: 'generic' }
    }
    if (usr === 's:SD' || type.name === 'Dictionary') {
      return type.args.length === 2 ? this.type({ k: 'dictionary', key: type.args[0], value: type.args[1] }, position, generics) : { ok: false, reason: 'generic' }
    }
    if (type.name === 'InlineArray' && type.args.length === 2) {
      return this.type({ k: 'array', t: type.args[1] }, position, generics)
    }
    // a generic owner's own parameter stands in a handle's type arguments, which the handle
    // keeps for its native value
    const args: string[] = []
    for (const arg of type.args) {
      if (arg.k === 'named' && !arg.args.length && generics.owned.has(arg.name)) {
        args.push(arg.name)
        continue
      }
      const b = this.type(arg, position, generics)
      if (!b.ok) return b
      args.push(b.ts)
    }
    const info = usr ? this.index.get(usr) : undefined
    if (info?.kind === 'typealias' && info.alias && this.aliasDepth < 16) {
      this.aliasDepth++
      try {
        return this.type(info.alias, position, NO_GENERICS)
      } finally {
        this.aliasDepth--
      }
    }
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
    return { ok: true, ts: handle(name, args) }
  }

  // what a generic parameter, or a member of one, was specialized to; a parameter nothing
  // specialized is a generic the emitter cannot name.
  generic(name: string, position: Position, generics: Generics): Bridged | undefined {
    const resolved = generics.resolved.get(name)
    if (resolved) {
      // a replacement is concrete: it resolves once, never through the table again
      return this.type(resolved, position, { ...generics, resolved: new Map() })
    }
    const root = name.split('.')[0]
    if (generics.params.has(root) || root === 'Self') return { ok: false, reason: 'generic' }
    return undefined
  }

  // an unsafe pointer crosses as the memory it points at. a raw pointer is bytes, a pointer to
  // a scalar is that scalar's typed array and a pointer to any other mappable value is an array
  // of it. javascript passes the memory in; native code writes through a mutable pointer. a
  // pointer native code hands back has no length, so it is an opaque handle that can go back in.
  pointer(type: Extract<SwiftType, { k: 'named' }>, position: Position, generics: Generics): Bridged {
    const name = type.name.split('.').at(-1)!
    if (name === 'OpaquePointer') return { ok: true, ts: handle(name, []) }
    if (name === 'CVaListPointer') return { ok: false, reason: 'variadic argument list' }
    const written = outPointee(type)
    if (written) {
      const unmanaged = written.k === 'optional' && written.t.k === 'named' && written.t.name.split('.').at(-1) === 'Unmanaged'
      if (position !== 'input' || unmanaged) return { ok: false, reason: 'pointer out-parameter' }
      const value = this.type(written, 'output', generics)
      return value.ok ? { ok: true, ts: `NativeOut<${value.ts}>` } : value
    }
    const sized = name.includes('Buffer')
    let memory: string
    const raw = name.includes('Raw')
    let elementTs = ''
    if (raw) memory = 'ArrayBuffer'
    else {
      const element = type.args[0]
      if (!element) return { ok: false, reason: 'pointer out-parameter' }
      // an optional or a flag written through is an out-parameter, handled above; a pointer to a
      // pointer is a table of addresses
      const bare = element.k === 'optional' ? undefined : element
      const pointee = bare?.k === 'named' ? bare.name.split('.').at(-1)! : ''
      if (!bare || BOOLEAN_NAMES.has(pointee) || pointee === 'Unmanaged') return { ok: false, reason: 'pointer out-parameter' }
      if (POINTERS.test(pointee)) return { ok: false, reason: 'pointer to pointer' }
      const value = this.type(bare, 'input', generics)
      if (!value.ok) return value
      memory = this.typedArray(bare) ?? `${wrap(value.ts)}[]`
      elementTs = value.ts
    }
    const erased = handle(name, raw ? [] : [elementTs])
    if (sized) return { ok: true, ts: memory }
    return { ok: true, ts: position === 'input' ? `${memory} | ${erased}` : erased }
  }

  // the typed array a scalar pointee fills, found through the c and sdk typealiases that name it
  typedArray(type: SwiftType, depth = 0): string | undefined {
    if (type.k !== 'named' || depth > 8) return undefined
    const last = type.name.split('.').at(-1)!
    if (TYPED_ARRAYS[last]) return TYPED_ARRAYS[last]
    if (C_ALIASES[last]) return TYPED_ARRAYS[C_ALIASES[last]]
    const alias = type.usr ? this.index.get(type.usr)?.alias : undefined
    return alias ? this.typedArray(alias, depth + 1) : undefined
  }

  // a metatype crosses as the name of a class the runtime can look up by name.
  metatype(type: SwiftType, generics: Generics): Bridged {
    if (type.k === 'existential') return this.metatype(type.t, generics)
    if (type.k === 'named') {
      const resolved = generics.resolved.get(type.name)
      if (resolved && resolved.k === 'named' && resolved.name !== type.name) return this.metatype(resolved, generics)
      if (generics.classes.has(type.name) || type.name === 'AnyObject') return { ok: true, ts: 'string' }
      const info = type.usr ? this.index.get(type.usr) : undefined
      if (info?.kind === 'class') return { ok: true, ts: 'string' }
      // an objective-c protocol is found by its name too
      if (info?.kind === 'protocol' && type.usr?.startsWith('c:objc(pl)')) return { ok: true, ts: 'string' }
    }
    return { ok: false, reason: 'metatype' }
  }

  // the specialization of a function's, method's or type's generics: each parameter takes the one
  // type every conformer of its constraints can be given, so the emitter calls the generic with it.
  generics(symbol: Symbol, owner: Symbol | undefined, own: string[] = []): Generics {
    const g: Generics = { params: new Set(), resolved: new Map(), classes: new Set(), owned: new Set(own) }
    for (const p of symbol.swiftGenerics?.parameters ?? []) g.params.add(p.name)
    for (const p of owner?.swiftGenerics?.parameters ?? []) {
      g.params.add(p.name)
      g.owned.add(p.name)
    }
    const constraints = [...constraintsOf(symbol), ...constraintsOf(owner)]
    const heads = new Set<string>()
    for (const c of constraints) heads.add(c.lhs)
    for (const name of g.params) heads.add(name)
    // a type is the parameter itself, or one of its members, whose constraints decide it
    for (const head of heads) {
      const specialized = this.specialize(head, constraints, g.params)
      if (specialized) g.resolved.set(head, specialized.type)
      if (specialized?.class) g.classes.add(head)
    }
    if (owner) {
      const info = this.index.get(owner.identifier.precise)
      const name = info ? `${info.module}.${info.path.join('.')}` : owner.pathComponents.join('.')
      g.resolved.set('Self', { k: 'named', name, usr: owner.identifier.precise, args: [] })
    } else if (symbol.swiftExtension && symbol.pathComponents.length > 1) {
      const name = `${symbol.swiftExtension.extendedModule}.${symbol.pathComponents.slice(0, -1).join('.')}`
      g.resolved.set('Self', { k: 'named', name, args: [] })
    }
    return g
  }

  specialize(head: string, constraints: Constraint[], params: Set<string>): { type: SwiftType; class?: boolean } | undefined {
    const mine = constraints.filter((c) => c.lhs === head)
    // a requirement that names another parameter ties two of them together, so neither stands alone
    const concrete = (c: Constraint) => !params.has(c.rhs.split(/[.<]/)[0])
    const named = (c: Constraint): SwiftType => ({ k: 'named', name: c.rhs.replace(/<.*$/, ''), usr: c.rhsPrecise, args: [] })
    const same = mine.find((c) => c.kind === 'sameType' && concrete(c))
    if (same) return { type: named(same) }
    const base = mine.find((c) => c.kind === 'superclass' && concrete(c))
    if (base) return { type: named(base), class: true }
    if (mine.some((c) => c.kind === 'sameType' || c.kind === 'superclass')) return undefined
    const protocols = mine.map((c) => c.rhs.split('.').at(-1)!)
    const only = (allowed: Set<string>) => protocols.every((p) => allowed.has(p))
    const std = (name: string): SwiftType => ({ k: 'named', name, usr: VALUE_NAMES[name], args: [] })
    const collection = protocols.find((p) => COLLECTIONS.has(p))
    if (collection) {
      // the memory a sequence, collection or acceleration buffer holds is an array of its element
      if (!only(new Set([...COLLECTIONS, ...PASSIVE]))) return undefined
      const element = this.specialize(`${head}.Element`, constraints, params)
      return element ? { type: { k: 'array', t: element.type } } : undefined
    }
    const integer = protocols.some((p) => INTEGERS.has(p))
    const floating = protocols.some((p) => FLOATS.has(p))
    if (integer || floating) {
      if (integer && floating) return undefined
      const allowed = integer ? INTEGER_OK : FLOAT_OK
      return only(allowed) ? { type: std(integer ? 'Int' : 'Double') } : undefined
    }
    if (protocols.includes('Numeric') || protocols.includes('SignedNumeric')) {
      return only(FLOAT_OK) ? { type: std('Double') } : undefined
    }
    if (protocols.includes('StringProtocol')) return only(STRING_OK) ? { type: std('String') } : undefined
    if (protocols.some((p) => DATA_PROTOCOLS.has(p))) return only(DATA_OK) ? { type: std('Data') } : undefined
    const erased = protocols.find((p) => ERASERS[p])
    if (erased) return only(new Set([...PASSIVE, erased])) ? { type: { k: 'named', name: ERASERS[erased], args: [] } } : undefined
    if (protocols.includes('Error')) return only(new Set(['Error', 'Sendable'])) ? { type: std('Error') } : undefined
    if (only(new Set(['Hashable', 'Equatable', 'Sendable']))) return { type: { k: 'named', name: 'Any', args: [] } }
    return undefined
  }

  protocolType(type: SwiftType, position: Position, generics: Generics): Bridged {
    if (type.k !== 'named') return this.type(type, position, generics)
    const info = type.usr ? this.index.get(type.usr) : undefined
    if (type.name === 'Error' || type.usr === 's:s5ErrorP') return { ok: true, ts: 'NativeError' }
    if (type.name === 'AnyObject' || type.name === 'Any') return { ok: true, ts: 'unknown' }
    const generic = this.generic(type.name, position, generics)
    if (generic) return generic
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

  callback(type: Extract<SwiftType, { k: 'function' }>, position: Position, generics: Generics): Bridged {
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

function handle(name: string, args: string[]) {
  return args.length ? `Handle<'${name}', [${args.join(', ')}]>` : `Handle<'${name}'>`
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

// the fragments of the type a typealias names, without a trailing where clause
function aliasFragments(symbol: Symbol) {
  const fragments = symbol.declarationFragments ?? []
  const eq = fragments.findIndex((f) => f.kind === 'text' && f.spelling.includes('='))
  if (eq < 0) return undefined
  const head = fragments[eq]
  const rest = [{ ...head, spelling: head.spelling.slice(head.spelling.indexOf('=') + 1) }, ...fragments.slice(eq + 1)]
  const where = rest.findIndex((f) => f.kind === 'keyword' && f.spelling.trim() === 'where')
  return where < 0 ? rest : rest.slice(0, where)
}

// the type a typealias names, as a swift type; a generic alias has no single target
function aliasTarget(symbol: Symbol): SwiftType | undefined {
  if (symbol.swiftGenerics?.parameters?.length) return undefined
  const fragments = aliasFragments(symbol)
  try {
    return fragments && parseType(fragments)
  } catch (error) {
    if (error instanceof TypeParseError) return undefined
    throw error
  }
}

export function judge(bridge: Bridge, symbol: Symbol, owner: Symbol | undefined): Verdict {
  const kind = symbol.kind.identifier
  const own = kind === 'swift.typealias' ? (symbol.swiftGenerics?.parameters ?? []).map((p) => p.name) : []
  const generics = bridge.generics(symbol, owner, own)
  try {
    if (kind === 'swift.class' || kind === 'swift.struct' || kind === 'swift.actor') return { covered: true }
    if (kind === 'swift.enum') return { covered: true }
    if (kind === 'swift.protocol') {
      const info = bridge.index.get(symbol.identifier.precise)
      return info?.associatedTypes ? { covered: false, reason: 'protocol with associated types' } : { covered: true }
    }
    if (kind === 'swift.associatedtype') return { covered: false, reason: 'generic' }
    if (kind === 'swift.typealias') {
      const fragments = aliasFragments(symbol)
      if (!fragments) return { covered: true }
      const b = bridge.type(parseType(fragments), 'output', generics)
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
