// decides how every public sdk declaration crosses to typescript. a value with a
// plain javascript form crosses as that value; everything else crosses as a
// handle that keeps the native value alive. a declaration that cannot cross
// says why, so coverage lists its reason instead of dropping it.
import type { Graph, Symbol } from './graph'
import { parameterDefaults, parameterType, parseType, typeText, type SwiftType, TypeParseError } from './types'

// protocols whose conformers the react state layer reads
export const OBSERVABLE = 's:11Observation10ObservableP'
export const ASYNC_SEQUENCE = 's:Sci'
export const PUBLISHER = 's:7Combine9PublisherP'

export type DeclarationInfo = {
  usr: string
  module: string
  path: string[]
  kind: string
  superclass?: string
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
  genericParameters?: string[]
  conformers?: string[]
  // objective-c generic owner: observed concrete witnesses for its single
  // parameter, each conforming to the parameter's bounds
  objcWitnesses?: string[]
  // protocols this declaration conforms to, from any framework's graph
  conformsTo?: string[]
  properties?: { name: string; type: SwiftType; writable: boolean }[]
  // importer-provided zero construction, with no competing overlay initializer
  cZeroInit?: string
  // typealias: the type it names, over its genericParameters
  alias?: SwiftType
}

export type Index = Map<string, DeclarationInfo>

// a generic requirement as the symbol graph spells it: `T: Protocol`, `T == Type` or `T: Superclass`.
// `lhs` is a parameter or a member path like `T.Element`.
type Constraint = { kind: 'conformance' | 'sameType' | 'superclass'; lhs: string; rhs: string; rhsPrecise?: string }
const constraintsOf = (symbol?: Symbol): Constraint[] => {
  const constraints = [...(symbol?.swiftGenerics?.constraints ?? [])] as Constraint[]
  // clang-imported generic classes can spell class bounds only in their swift
  // declaration, leaving the structured constraint list empty.
  const declaration = symbol?.declarationFragments?.map((f) => f.spelling).join('') ?? ''
  const clause = /\bwhere\s+([^{}]+)/.exec(declaration)?.[1]
  const params = new Set(symbol?.swiftGenerics?.parameters?.map((p) => p.name))
  for (const part of clause?.split(',') ?? []) {
    const bound = /^\s*([A-Za-z_]\w*)\s*:\s*(?:Swift\.)?AnyObject\s*$/.exec(part)
    if (!bound || !params.has(bound[1])) continue
    if (!constraints.some((c) => c.kind === 'conformance' && c.lhs === bound[1] && c.rhs.split('.').at(-1) === 'AnyObject'))
      constraints.push({ kind: 'conformance', lhs: bound[1], rhs: 'AnyObject' })
  }
  return constraints
}

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
// the standard values a caller may name as a generic type
const PICKED_VALUES = new Set(['Bool', 'Int', 'UInt', 'Double', 'Float', 'String', 'CGFloat', 'Date', 'URL', 'Data', 'UUID'])
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
// a c error out-parameter writes an Unmanaged<CFError>? the caller reads back as
// the error; other Unmanaged pointees stay out
export function cErrorOut(written: SwiftType): SwiftType | undefined {
  const unmanaged = written.k === 'optional' && written.t.k === 'named' && written.t.name.split('.').at(-1) === 'Unmanaged'
    ? written.t.args[0]
    : undefined
  if (!unmanaged || unmanaged.k !== 'named' || unmanaged.name.split('.').at(-1) !== 'CFError') return undefined
  return { k: 'optional', t: unmanaged, implicit: false }
}
// ownership of an Unmanaged result from its API's name: Create and Copy return
// +1, Get returns +0; anything else has no premise and stays a handle
export function unmanagedReturn(type: SwiftType, base: string): { inner: SwiftType; retained: boolean } | undefined {
  const wrapped = type.k === 'optional' ? type.t : type
  const pointee = wrapped.k === 'named' && wrapped.name.split('.').at(-1) === 'Unmanaged' ? wrapped.args[0] : undefined
  if (!pointee || pointee.k !== 'named') return undefined
  const inner = type.k === 'optional' ? { k: 'optional', t: pointee, implicit: false } as SwiftType : pointee
  if (/Create|Copy/.test(base)) return { inner, retained: true }
  if (/Get/.test(base)) return { inner, retained: false }
  return undefined
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
// App Store processing rejects a new app whose binary references UIWebView
// (ITMS-90809), so no binding names it: its class, delegate, enums and members,
// nor any member whose signature carries one of them. clang and swift usrs both
// spell the imported names (c:objc(cs)UIWebView, s:So24UIWebViewNavigationTypeV)
const APP_STORE_REJECTED = /UIWebView|UIWebPagination/
const appStoreRejected = (usr: string | undefined): Bridged | undefined =>
  usr && APP_STORE_REJECTED.test(usr) ? { ok: false, reason: 'rejected by App Store processing' } : undefined

const UNBRIDGEABLE_NAMES: Record<string, string> = {
  Selector: 'selector', NSZone: 'pointer',
  ObjectIdentifier: 'identity', Hasher: 'hashing', AnyKeyPath: 'key path', PartialKeyPath: 'key path',
  KeyPath: 'key path', WritableKeyPath: 'key path', ReferenceWritableKeyPath: 'key path',
}

// the facts about one graph the index needs, small enough to keep for the
// whole sdk while each graph is read once.
export type IndexFacts = {
  declarations: DeclarationInfo[]
  members: { owner: string; kind: 'case' | 'payloadCase' | 'rawValue' | 'rawInit' | 'constant'; name: string; raw?: 'string' | 'number' }[]
  properties?: { owner: string; name: string; type: SwiftType; writable: boolean }[]
  conformances?: { source: string; target: string }[]
  optionSets: string[]
  requirements: { owner: string; blocks: boolean; associated: boolean }[]
  specializations?: { owner: string; arg: string }[]
  zeroInitializers?: { owner: string; usr: string; imported: boolean }[]
}

// the effects a function declares after its parameter list
export function effectsOf(decl: string) {
  const open = decl.indexOf('(')
  if (open < 0) return { isAsync: false, throws: false }
  let depth = 0
  let close = decl.length
  for (let i = open; i < decl.length; i++) {
    if (decl[i] === '(') depth++
    if (decl[i] === ')' && --depth === 0) {
      close = i
      break
    }
  }
  const tail = decl.slice(close + 1).split(/->|\{|\bwhere\b/)[0]
  return { isAsync: /\basync\b/.test(tail), throws: /\b(re)?throws\b/.test(tail) }
}

export function collectFacts(graph: Graph): IndexFacts {
  const facts: IndexFacts = { declarations: [], members: [], optionSets: [], requirements: [], conformances: [], properties: [], specializations: [], zeroInitializers: [] }
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]))
  const parents = new Map(graph.relationships.filter((r) => r.kind === 'inheritsFrom').map((r) => [r.source, r.target]))
  for (const symbol of graph.symbols) {
    if (!TYPE_KINDS.has(symbol.kind.identifier)) continue
    if (APP_STORE_REJECTED.test(symbol.identifier.precise)) continue
    facts.declarations.push({
      usr: symbol.identifier.precise,
      module: graph.module,
      path: symbol.pathComponents,
      kind: symbol.kind.identifier.slice('swift.'.length),
      superclass: parents.get(symbol.identifier.precise),
      genericParameters: symbol.swiftGenerics?.parameters?.map((p) => p.name),
      alias: symbol.kind.identifier === 'swift.typealias' ? aliasTarget(symbol) : undefined,
    })
  }
  // concrete single-argument specializations Owner<Arg>, for objective-c
  // generic owners whose witnesses the sdk itself names
  for (const symbol of graph.symbols) {
    const fragments = [...(symbol.declarationFragments ?? []),
      ...(symbol.functionSignature?.parameters ?? []).flatMap((p) => p.declarationFragments),
      ...(symbol.functionSignature?.returns ?? [])]
    for (let i = 0; i + 3 < fragments.length; i++) {
      const owner = fragments[i]
      const open = fragments[i + 1]
      const arg = fragments[i + 2]
      const close = fragments[i + 3]
      if (owner.kind === 'typeIdentifier' && owner.preciseIdentifier &&
        open.kind === 'text' && open.spelling === '<' &&
        arg.kind === 'typeIdentifier' && arg.preciseIdentifier &&
        close.kind === 'text' && close.spelling.startsWith('>')) {
        facts.specializations!.push({ owner: owner.preciseIdentifier, arg: arg.preciseIdentifier })
      }
    }
  }
  for (const rel of graph.relationships) {
    if (rel.kind === 'conformsTo' || rel.kind === 'inheritsFrom') facts.conformances!.push({ source: rel.source, target: rel.target })
    if (rel.kind === 'conformsTo' && rel.target === 's:s9OptionSetP') facts.optionSets.push(rel.source)
    const member = byUsr.get(rel.source)
    if (!member) continue
    const name = member.pathComponents.at(-1)!
    const kind = member.kind.identifier
    if (rel.kind === 'memberOf') {
      if (kind === 'swift.init' && rel.target.startsWith('c:@S@')) {
        const parameters = member.functionSignature?.parameters ?? []
        if (name === 'init()') {
          const name = rel.target.slice('c:@S@'.length)
          const usr = member.identifier.precise
          facts.zeroInitializers!.push({ owner: rel.target, usr,
            imported: usr === `s:So${name.length}${name}VABycfc`
              && !member.swiftExtension && !member.synthesizedInit
              && !parameters.length && member.declarationFragments?.map((f) => f.spelling).join('') === 'init()'
              && /\.(h|hh|hpp)$/.test(member.location?.uri ?? ''),
          })
        }
      }
      if (kind === 'swift.property' && ['public', 'open'].includes(member.accessLevel)) {
        const decl = (member.declarationFragments ?? []).map((f) => f.spelling).join('')
        try {
          const fragments = member.declarationFragments ?? []
          const nameAt = fragments.findIndex((f) => f.kind === 'identifier')
          const colon = fragments.findIndex((f, i) => i > nameAt && f.kind === 'text' && f.spelling.includes(':'))
          if (colon >= 0 && !/\b(async|throws)\b|@MainActor/.test(decl)) {
            const tail = fragments.slice(colon)
            const body = [{ ...tail[0], spelling: tail[0].spelling.slice(tail[0].spelling.indexOf(':') + 1) }, ...tail.slice(1)]
            const end = body.findIndex((f) => f.kind === 'text' && /[{=]/.test(f.spelling))
            const type = parseType(end < 0 ? body : [...body.slice(0, end), { ...body[end], spelling: body[end].spelling.split(/[{=]/)[0] }])
            facts.properties!.push({ owner: rel.target, name, type, writable: /\bset\b/.test(decl) && !/private\(set\)/.test(decl) })
          }
        } catch (error) { if (!(error instanceof TypeParseError)) throw error }
      }
      if (kind === 'swift.enum.case') {
        const payload = (member.declarationFragments ?? []).some((f) => f.spelling.includes('('))
        facts.members.push({ owner: rel.target, kind: payload ? 'payloadCase' : 'case', name })
      } else if (kind === 'swift.property' && name === 'rawValue') {
        const type = member.declarationFragments?.find((f) => f.kind === 'typeIdentifier')
        facts.members.push({ owner: rel.target, kind: 'rawValue', name, raw: type?.preciseIdentifier === 's:SS' ? 'string' : 'number' })
      } else if (kind === 'swift.init' && name === 'init(rawValue:)') {
        // the importer synthesizes rawValue on a swift_newtype struct without a symbol, so its raw type comes from the init
        const type = member.functionSignature?.parameters?.[0]?.declarationFragments?.find((f) => f.kind === 'typeIdentifier')
        facts.members.push({ owner: rel.target, kind: 'rawInit', name, raw: type?.preciseIdentifier === 's:SS' ? 'string' : 'number' })
      } else if (kind === 'swift.type.property' &&
        member.declarationFragments?.some((f) => f.kind === 'typeIdentifier' && f.preciseIdentifier === rel.target)) {
        facts.members.push({ owner: rel.target, kind: 'constant', name })
      }
    }
    if (rel.kind === 'requirementOf' || rel.kind === 'optionalRequirementOf') {
      const returns = member.functionSignature?.returns ?? []
      const returnsVoid = !returns.length || ['()', 'Void'].includes(returns.map((f) => f.spelling).join('').trim())
      // javascript answers a throwing async requirement later through its
      // promise, unless the signature names the method's own generics or the
      // protocol's associated types, which have no concrete wire type
      const effects = effectsOf((member.declarationFragments ?? []).map((f) => f.spelling).join(''))
      const fragments = [...(member.functionSignature?.parameters ?? []).flatMap((p) => p.declarationFragments), ...returns]
      const answersLater = effects.isAsync && effects.throws &&
        (member.swiftGenerics?.parameters ?? []).every((p) => p.name === 'Self') &&
        !fragments.some((f) => /^Self\b/.test(f.spelling) || byUsr.get(f.preciseIdentifier ?? '')?.kind.identifier === 'swift.associatedtype')
      // a required member javascript cannot answer synchronously rules the protocol out
      facts.requirements.push({
        owner: rel.target,
        associated: kind === 'swift.associatedtype',
        blocks: rel.kind === 'requirementOf' && (kind !== 'swift.method' || !(returnsVoid || answersLater)),
      })
    }
  }
  return facts
}

export function buildIndex(all: IndexFacts[]): Index {
  const index: Index = new Map()
  const rawRepresentable = new Set(all.flatMap((facts) => (facts.conformances ?? []).filter((rel) => rel.target === 's:SY').map((rel) => rel.source)))
  for (const facts of all) for (const d of facts.declarations) index.set(d.usr, { ...d, cZeroInit: undefined })
  // inspect every framework's extensions, including overlays that add an
  // initializer without repeating the C record declaration in their graph.
  const zeros = new Map<string, NonNullable<IndexFacts['zeroInitializers']>>()
  for (const facts of all) for (const init of facts.zeroInitializers ?? []) {
    zeros.set(init.owner, [...(zeros.get(init.owner) ?? []), init])
  }
  for (const [usr, initializers] of zeros) {
    const owner = index.get(usr)
    if (owner && initializers.every((init) => init.imported && init.usr === initializers[0].usr))
      owner.cZeroInit = initializers[0].usr
  }
  for (const facts of all) {
    for (const property of facts.properties ?? []) {
      const owner = index.get(property.owner)
      if (owner) owner.properties = [...(owner.properties ?? []), property]
    }
    for (const rel of facts.conformances ?? []) {
      const protocol = index.get(rel.target)
      if (protocol) protocol.conformers = [...new Set([...(protocol.conformers ?? []), rel.source])]
      const conformer = index.get(rel.source)
      if (conformer) conformer.conformsTo = [...new Set([...(conformer.conformsTo ?? []), rel.target])]
    }
    for (const usr of facts.optionSets) {
      const info = index.get(usr)
      if (info) info.optionSet = true
    }
    for (const m of facts.members) {
      const owner = index.get(m.owner)
      if (!owner) continue
      if (m.kind === 'rawInit') {
        if (rawRepresentable.has(m.owner)) owner.rawValue ??= m.raw
        continue
      }
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
    for (const s of facts.specializations ?? []) {
      const owner = index.get(s.owner)
      const arg = index.get(s.arg)
      if (!owner || !owner.usr.startsWith('c:objc') || owner.genericParameters?.length !== 1) continue
      if (!arg || !['class', 'struct', 'enum', 'actor'].includes(arg.kind) || arg.genericParameters?.length || arg.path.some((p) => p.startsWith('_'))) continue
      owner.objcWitnesses = [...new Set([...(owner.objcWitnesses ?? []), s.arg])].sort()
    }
  }
  return index
}

export type Bridged = { ok: true; ts: string } | { ok: false; reason: string }

type Position = 'input' | 'output'

// how a declaration's generic parameters resolve. `resolved` holds the type a parameter, or a
// member like `T.Element`, specializes to; `classes` are the ones a superclass constraint
// pins; `owned` are the owner's or alias's own parameters, which a handle may keep as type
// arguments. `objcOpen` are an objective-c owner's parameters that stay open because the
// sdk names their witnesses but no single canonical one exists.
export type Generics = {
  params: Set<string>
  resolved: Map<string, SwiftType>
  classes: Set<string>
  owned: Set<string>
  objcOpen: Set<string>
}
export const NO_GENERICS: Generics = { params: new Set(), resolved: new Map(), classes: new Set(), owned: new Set(), objcOpen: new Set() }

// canonical witnesses for standard constraints; the compiler checks conditional conformances.
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
  private witnesses = new Map<string, SwiftType | null>()
  constructor(readonly index: Index) {}

  // replace parameters throughout containers, callbacks and associated member paths.
  substitute(type: SwiftType, generics: Generics, active = new Set<string>()): SwiftType {
    const sub = (t: SwiftType) => this.substitute(t, generics, active)
    switch (type.k) {
      case 'named': {
        if (!active.has(type.name)) {
          const replacement = generics.resolved.get(type.name)
          if (replacement) return this.substitute(replacement, generics, new Set([...active, type.name]))
          const [root, ...members] = type.name.split('.')
          const base = generics.resolved.get(root)
          if (base && members.length) {
            const resolved = this.substitute(base, generics, new Set([...active, root]))
            if (members.join('.') === 'Element' && resolved.k === 'array') return resolved.t
            return { k: 'named', name: `${typeText(resolved)}.${members.join('.')}`, args: type.args.map(sub) }
          }
        }
        return { ...type, args: type.args.map(sub) }
      }
      case 'dictionary': return { ...type, key: sub(type.key), value: sub(type.value) }
      case 'tuple': return { ...type, items: type.items.map((i) => ({ ...i, t: sub(i.t) })) }
      case 'function': return { ...type, params: type.params.map((p) => ({ ...p, t: sub(p.t) })), result: sub(type.result) }
      case 'composition': return { ...type, items: type.items.map(sub) }
      default: return { ...type, t: sub(type.t) }
    }
  }

  // the type a named alias stands for, with the parameters it inherits from a generic owner and
  // its own, in that order, taken from the arguments every segment of the name carries
  aliasOf(type: SwiftType & { k: 'named' }, info = type.usr ? this.index.get(type.usr) : undefined): SwiftType | undefined {
    if (!info?.alias) return undefined
    const params = info.genericParameters ?? []
    if (!params.length) return info.alias
    if (type.args.length !== params.length) return undefined
    return this.substitute(info.alias, { ...NO_GENERICS, resolved: new Map(params.map((p, i) => [p, type.args[i]])) })
  }

  functions(type: SwiftType, depth = 0): SwiftType {
    if (depth > 12) return type
    const map = (t: SwiftType) => this.functions(t, depth + 1)
    switch (type.k) {
      case 'named': {
        const alias = this.aliasOf(type)
        if (alias) {
          const expanded = map(alias)
          if (expanded.k === 'function' || expanded.k === 'optional' && expanded.t.k === 'function') return expanded
          // an alias of an out pointer, such as NSErrorPointer, is that pointer
          if (outPointee(expanded)) return expanded
        }
        return { ...type, args: type.args.map(map) }
      }
      case 'function': return { ...type, params: type.params.map((p) => ({ ...p, t: map(p.t) })), result: map(type.result) }
      case 'dictionary': return { ...type, key: map(type.key), value: map(type.value) }
      case 'tuple': return { ...type, items: type.items.map((p) => ({ ...p, t: map(p.t) })) }
      case 'composition': return { ...type, items: type.items.map(map) }
      default: return { ...type, t: map(type.t) }
    }
  }

  // graph conformances select a scalar witness, or the only concrete sdk conformer.
  // the compiler checks the full set of requirements before an entry is admitted.
  protocolWitness(protocols: Constraint[]): SwiftType | undefined {
    const key = protocols.map((c) => c.rhsPrecise ?? c.rhs).sort().join('&')
    if (this.witnesses.has(key)) return this.witnesses.get(key) ?? undefined
    const infos = protocols.map((c) => c.rhsPrecise ? this.index.get(c.rhsPrecise) : undefined)
    const pools = infos.map((info) => new Set(info?.conformers ?? []))
    const usrs = [...(pools[0] ?? [])].filter((usr) => pools.every((p) => p.has(usr)))
    const scalar = ['Double', 'Float', 'Int', 'UInt', 'String', 'Data'].find((name) => usrs.includes(VALUE_NAMES[name]))
    const concrete = usrs.map((usr) => this.index.get(usr)).filter((info): info is DeclarationInfo =>
      !!info && ['class', 'struct', 'enum', 'actor'].includes(info.kind) && !info.genericParameters?.length && !info.path.some((p) => p.startsWith('_')))
    const info = concrete.length === 1 ? concrete[0] : undefined
    const witness: SwiftType | undefined = scalar
      ? { k: 'named', name: scalar, usr: VALUE_NAMES[scalar], args: [] }
      : info ? { k: 'named', name: `${info.module}.${info.path.join('.')}`, usr: info.usr, args: [] } : undefined
    this.witnesses.set(key, witness ?? null)
    return witness
  }

  // the public types a caller may name for a generic parameter with these
  // conformance requirements:
  // standard values and concrete sdk types that conform to all of them and
  // cross as results; a protocol most of the sdk conforms to offers only the
  // standard values
  pickable(requirements: Constraint[], limit = 24): { name: string; swift: string }[] {
    // a standard library protocol has no sdk conformer list; the standard
    // values conform to the passive ones
    const values = Object.entries(VALUE_NAMES).filter(([name]) => PICKED_VALUES.has(name))
    const pools = requirements.map((c) => {
      const info = c.rhsPrecise ? this.index.get(c.rhsPrecise) : undefined
      if (!info && PASSIVE.has(c.rhs.split('.').at(-1)!)) return new Set(values.map(([, usr]) => usr))
      return new Set(info?.conformers ?? [])
    })
    const usrs = [...(pools[0] ?? [])].filter((usr) => pools.every((p) => p.has(usr)))
    const named = values.filter(([, usr]) => usrs.includes(usr)).map(([name]) => ({ name, swift: name }))
    const types = usrs.map((usr) => this.index.get(usr)).filter((info): info is DeclarationInfo =>
      !!info && ['class', 'struct', 'enum', 'actor'].includes(info.kind) && !info.genericParameters?.length &&
      !info.path.some((p) => p.startsWith('_')) && !Object.values(VALUE_NAMES).includes(info.usr) &&
      this.type({ k: 'named', name: `${info.module}.${info.path.join('.')}`, usr: info.usr, args: [] }, 'output', NO_GENERICS).ok)
      .map((info) => ({ name: tsName(`${info.module}.${info.path.join('.')}`), swift: `${info.module}.${info.path.map((p) => /^[A-Za-z_]\w*$/.test(p) ? p : `\`${p}\``).join('.')}` }))
      .sort((a, b) => (a.name < b.name ? -1 : 1))
    return types.length > limit ? named : [...named, ...types]
  }

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
      case 'existential': {
        // a spelled `any P` with associated types is a native value javascript
        // only holds and passes back; it never implements one
        const info = !type.some && type.t.k === 'named' && !type.t.args.length && type.t.usr ? this.index.get(type.t.usr) : undefined
        if (info?.associatedTypes) return { ok: true, ts: `Handle<'${tsName(`${info.module}.${info.path.join('.')}`)}'>` }
        return this.protocolType(type.t, position, generics)
      }
      case 'composition': {
        const items = type.items.map((item) => this.protocolType(item, position, generics))
        const bad = items.find((item) => !item.ok)
        return bad ?? { ok: true, ts: items.map((item) => (item as { ts: string }).ts).join(' & ') }
      }
      case 'inout':
        return this.type(type.t, position, generics)
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
    if (['KeyPath', 'WritableKeyPath', 'ReferenceWritableKeyPath', 'PartialKeyPath', 'AnyKeyPath'].includes(last)) {
      const args = type.args.map((arg) => this.type(arg, position, generics))
      const bad = args.find((arg) => !arg.ok)
      if (bad) return bad
      const erased = handle(`Swift.${last}`, args.map((arg) => (arg as { ts: string }).ts))
      const names = position === 'input' ? this.keyPaths(type, generics).map((p) => `'${p.name}'`) : []
      return { ok: true, ts: names.length ? `${names.join(' | ')} | ${erased}` : erased }
    }
    if (UNBRIDGEABLE_NAMES[last]) return { ok: false, reason: UNBRIDGEABLE_NAMES[last] }
    const usr = type.usr ?? VALUE_NAMES[type.name]
    const rejected = appStoreRejected(usr)
    if (rejected) return rejected
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
      if (arg.k === 'named' && !arg.args.length && generics.owned.has(arg.name) && !generics.resolved.has(arg.name)) {
        args.push(arg.name)
        continue
      }
      const b = this.type(arg, position, generics)
      if (!b.ok) return b
      args.push(b.ts)
    }
    const info = usr ? this.index.get(usr) : undefined
    // a generic alias stays a named handle here; functions() expands the callbacks it names
    if (info?.kind === 'typealias' && info.alias && !info.genericParameters?.length && this.aliasDepth < 16) {
      this.aliasDepth++
      try {
        return this.type(info.alias, position, NO_GENERICS)
      } finally {
        this.aliasDepth--
      }
    }
    // a generic alias whose arguments do not cover its parameters names no provable type
    if (info?.kind === 'typealias' && info.genericParameters?.length && !this.aliasOf(type, info)) {
      return { ok: false, reason: 'generic' }
    }
    const name = tsName(info ? `${info.module}.${info.path.join('.')}` : type.name)
    if (info?.kind === 'enum' && info.cases?.length && !info.payload) {
      return { ok: true, ts: info.cases.map((c) => `'${c}'`).join(' | ') }
    }
    if (info?.optionSet) {
      return { ok: true, ts: info.constants?.length ? `(${info.constants.map((c) => `'${c}'`).join(' | ')})[]` : 'string[]' }
    }
    if (info?.rawValue && info.kind === 'struct') {
      // init(rawValue:) admits any raw value, and toJS returns one no constant names
      return { ok: true, ts: [...(info.constants ?? []).map((c) => `'${c}'`), `(${info.rawValue} & {})`].join(' | ') }
    }
    if (info?.kind === 'protocol') return this.protocolType(type, position, generics)
    if (info?.kind === 'associatedtype') return { ok: false, reason: 'generic' }
    // a class, actor, struct or payload enum crosses as a handle to the native value
    return { ok: true, ts: handle(name, args) }
  }

  // what a generic parameter, or a member of one, was specialized to; a parameter nothing
  // specialized is a generic the emitter cannot name.
  generic(name: string, position: Position, generics: Generics): Bridged | undefined {
    const direct = generics.resolved.get(name)
    const resolved = direct ?? (name.includes('.') && generics.resolved.has(name.split('.')[0])
      ? this.substitute({ k: 'named', name, args: [] }, generics) : undefined)
    if (resolved) {
      // a replacement is concrete: it resolves once, never through the table again
      return this.type(resolved, position, { ...generics, resolved: new Map() })
    }
    const root = name.split('.')[0]
    if (generics.objcOpen.has(root) && !name.includes('.')) return { ok: true, ts: root }
    if (generics.params.has(root) || root === 'Self') return { ok: false, reason: `generic: no canonical witness for ${name}` }
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
      const error = cErrorOut(written)
      const unmanaged = !error && written.k === 'optional' && written.t.k === 'named' && written.t.name.split('.').at(-1) === 'Unmanaged'
      if (position !== 'input' || unmanaged) return { ok: false, reason: 'pointer out-parameter' }
      const value = this.type(error ?? written, 'output', generics)
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
    const alias = this.aliasOf(type)
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

  // each parameter takes a canonical concrete witness of its constraints. callers use this
  // specialization, recorded in the entry, rather than arbitrary conforming native values.
  generics(symbol: Symbol, owner: Symbol | undefined, own: string[] = []): Generics {
    const g: Generics = { params: new Set(), resolved: new Map(), classes: new Set(), owned: new Set(own), objcOpen: new Set() }
    for (const p of symbol.swiftGenerics?.parameters ?? []) g.params.add(p.name)
    for (const p of owner?.swiftGenerics?.parameters ?? []) {
      g.params.add(p.name)
      g.owned.add(p.name)
    }
    // member constraints precede the owner's weaker requirements.
    const constraints = [...constraintsOf(symbol), ...constraintsOf(owner), ...(symbol.swiftExtension?.constraints ?? []) as Constraint[]]
    const heads = new Set([...g.params, ...constraints.map((c) => c.lhs)])
    for (const head of heads) {
      const specialized = this.specialize(head, constraints, g.params)
      if (specialized) g.resolved.set(head, specialized.type)
      if (specialized?.class) g.classes.add(head)
    }
    // an objective-c owner's parameter with sdk-named witnesses but no single
    // canonical one stays open; swift erases it and typescript keeps it generic
    if (owner?.identifier.precise.startsWith('c:objc') && owner.swiftGenerics?.parameters?.length === 1) {
      const witnesses = this.index.get(owner.identifier.precise)?.objcWitnesses
      if (witnesses?.length) {
        for (const p of owner.swiftGenerics.parameters) {
          if (g.params.has(p.name) && !g.resolved.has(p.name)) g.objcOpen.add(p.name)
        }
      }
    }
    if (owner) {
      const info = this.index.get(owner.identifier.precise)
      const name = info ? `${info.module}.${info.path.join('.')}` : owner.pathComponents.join('.')
      g.resolved.set('Self', { k: 'named', name, usr: owner.identifier.precise, args: (owner.swiftGenerics?.parameters ?? []).map((p) => g.resolved.get(p.name) ?? { k: 'named', name: p.name, args: [] }) })
    } else if (symbol.swiftExtension && symbol.pathComponents.length > 1) {
      const name = `${symbol.swiftExtension.extendedModule}.${symbol.pathComponents.slice(0, -1).join('.')}`
      g.resolved.set('Self', { k: 'named', name, args: [] })
    }
    return g
  }

  specialize(head: string, constraints: Constraint[], params: Set<string>, active = new Set<string>()): { type: SwiftType; class?: boolean } | undefined {
    if (active.has(head)) return undefined
    const next = new Set([...active, head])
    // equality is symmetric and transitive, including associated member paths.
    const equal = new Set([head])
    for (let changed = true; changed;) {
      changed = false
      for (const c of constraints) if (c.kind === 'sameType' && (equal.has(c.lhs) || equal.has(c.rhs))) {
        for (const name of [c.lhs, c.rhs]) if (!equal.has(name)) { equal.add(name); changed = true }
      }
    }
    const mine = constraints.filter((c) => equal.has(c.lhs))
    const concrete = (name: string) => !params.has(name.split(/[.<]/)[0]) && !name.startsWith('Self.')
    const parse = (name: string, usr?: string): SwiftType | undefined => {
      try {
        const t = parseType([{ kind: 'text', spelling: name }])
        if (t.k === 'named' && usr) {
          const info = this.index.get(usr)
          return { ...t, usr, name: info ? `${info.module}.${info.path.join('.')}` : t.name }
        }
        return t
      } catch { return undefined }
    }
    const same = [...equal].find((name) => name !== head && concrete(name))
    if (same) {
      const type = parse(same, constraints.find((c) => c.rhs === same)?.rhsPrecise)
      return type ? { type } : undefined
    }
    const base = mine.find((c) => c.kind === 'superclass' && concrete(c.rhs))
    if (base) {
      const type = parse(base.rhs, base.rhsPrecise)
      return type ? { type, class: true } : undefined
    }
    const requirements = mine.filter((c) => c.kind === 'conformance')
    const protocols = requirements.map((c) => c.rhs.split('.').at(-1)!)
    const only = (allowed: Set<string>) => protocols.every((p) => allowed.has(p))
    const std = (name: string): SwiftType => ({ k: 'named', name, usr: VALUE_NAMES[name], args: [] })
    const associated = (member: string) => {
      for (const name of equal) {
        const value = this.specialize(`${name}.${member}`, constraints, params, next)
        if (value) return value.type
      }
      return undefined
    }
    if (protocols.some((p) => COLLECTIONS.has(p))) {
      if (!only(new Set([...COLLECTIONS, ...PASSIVE]))) return undefined
      const element = associated('Element')
      return element ? { type: { k: 'array', t: element } } : undefined
    }
    if (protocols.includes('RangeExpression')) {
      const bound = associated('Bound')
      return bound ? { type: { k: 'named', name: 'Swift.Range', args: [bound] } } : undefined
    }
    const integer = protocols.some((p) => INTEGERS.has(p))
    const floating = protocols.some((p) => FLOATS.has(p))
    if (integer || floating) {
      if (integer && floating) return undefined
      return only(integer ? INTEGER_OK : FLOAT_OK) ? { type: std(protocols.includes('UnsignedInteger') ? 'UInt' : integer ? 'Int' : 'Double') } : undefined
    }
    if (protocols.some((p) => ['Numeric', 'SignedNumeric', 'AdditiveArithmetic'].includes(p))) {
      return only(FLOAT_OK) ? { type: std('Double') } : undefined
    }
    if (protocols.includes('StringProtocol')) return only(STRING_OK) ? { type: std('String') } : undefined
    if (protocols.some((p) => DATA_PROTOCOLS.has(p))) return only(DATA_OK) ? { type: std('Data') } : undefined
    const erased = protocols.find((p) => ERASERS[p])
    if (erased) return only(new Set([...PASSIVE, erased])) ? { type: { k: 'named', name: ERASERS[erased], args: [] } } : undefined
    if (protocols.includes('AnyObject') && only(new Set(['AnyObject', 'Sendable']))) return { type: { k: 'named', name: 'Foundation.NSObject', args: [] }, class: true }
    if (protocols.includes('Error')) return only(new Set(['Error', 'Sendable'])) ? { type: std('Error') } : undefined
    if (protocols.length && only(PASSIVE)) return { type: std('Int') }
    if (requirements.length) {
      const witness = this.protocolWitness(requirements)
      return witness ? { type: witness } : undefined
    }
    // unconstrained parameters can use Any; associated paths need a known root.
    if (params.has(head)) return { type: std('Any') }
    return undefined
  }

  protocolType(type: SwiftType, position: Position, generics: Generics): Bridged {
    if (type.k !== 'named') return this.type(type, position, generics)
    const rejected = appStoreRejected(type.usr)
    if (rejected) return rejected
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

  keyPaths(type: Extract<SwiftType, { k: 'named' }>, generics: Generics) {
    const [root, value] = type.args.map((t) => this.substitute(t, generics))
    const info = root?.k === 'named' && root.usr ? this.index.get(root.usr) : undefined
    if (!info || info.genericParameters?.length) return []
    const writable = type.name.split('.').at(-1) !== 'KeyPath' && !type.name.endsWith('PartialKeyPath')
    const signature = (t: SwiftType): string => t.k === 'named' ? `${t.usr ?? t.name}<${t.args.map(signature).join(',')}>` : t.k === 'optional' ? `${signature(t.t)}?` : typeText(t)
    return (info.properties ?? []).filter((p) => (!writable || p.writable) && (!value || signature(p.type) === signature(value)))
  }

  callback(type: Extract<SwiftType, { k: 'function' }>, position: Position, generics: Generics): Bridged {
    if (position === 'output') for (const p of type.params) {
      const callback = p.t.k === 'optional' ? p.t.t : p.t
      if (callback.k === 'function' && (callback.async || callback.throws || !(callback.result.k === 'named' && callback.result.name === 'Void' || callback.result.k === 'tuple' && !callback.result.items.length))) {
        return { ok: false, reason: 'callable handle requires an asynchronous JS callback result' }
      }
    }
    const argPosition: Position = position === 'input'  ? 'output' : 'input'
    const resultPosition: Position = position === 'input' ? 'input' : 'output'
    const params = type.params.map((p) => {
      const out = position === 'input' ? callbackOut(p.t) : undefined
      const b = this.type(out ?? p.t, argPosition, generics)
      return out && b.ok ? { ok: true as const, ts: `NativeOut<${b.ts}>` } : b
    })
    const bad = params.find((p) => !p.ok)
    if (bad) return bad
    const result = this.type(type.result, resultPosition, generics)
    if (!result.ok) return result
    if (position === 'input' && result.ts !== 'void' && !type.async && !type.throws) {
      return { ok: false, reason: 'callback cannot propagate synchronous failure' }
    }
    if (position === 'input' && type.result.k === 'function') return { ok: false, reason: 'callback returns a function' }
    const args = params.map((p, i) => `a${i}: ${(p as { ts: string }).ts}`).join(', ')
    return { ok: true, ts: `(${args}) => ${type.async || position === 'output' ? `Promise<${result.ts}>` : result.ts}` }
  }

}
// stop flags have a defined cancellation path, so callback failures can stop the operation.
export function callbackOut(type: SwiftType): SwiftType | undefined {
  if (type.k !== 'named' || type.name.split('.').at(-1) !== 'UnsafeMutablePointer') return undefined
  const t = type.args[0]
  return t?.k === 'named' && ['ObjCBool', 'Bool'].includes(t.name.split('.').at(-1)!) ? t : undefined
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
  if (APP_STORE_REJECTED.test(symbol.identifier.precise)) return false
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

// the type a typealias names, as a swift type
function aliasTarget(symbol: Symbol): SwiftType | undefined {
  const fragments = aliasFragments(symbol)
  try {
    return fragments && parseType(fragments)
  } catch (error) {
    if (error instanceof TypeParseError) return undefined
    throw error
  }
}

// a method generic over a type its caller names through a `P.Type` parameter,
// with only conformance requirements on P, takes that type by name from the
// public conformers of those requirements
export function pickOf(bridge: Bridge, symbol: Symbol, owner: Symbol | undefined, generics: Generics) {
  const own = [...generics.params].filter((name) => !generics.owned.has(name))
  if (own.length !== 1 || owner?.swiftGenerics?.parameters?.length || symbol.kind.identifier === 'swift.init') return undefined
  const name = own[0]
  const requirements = [...constraintsOf(symbol), ...(symbol.swiftExtension?.constraints ?? []) as Constraint[]]
  if (!requirements.length || !requirements.every((c) => c.kind === 'conformance' && c.lhs === name)) return undefined
  const param = (symbol.functionSignature?.parameters ?? []).findIndex((p) => {
    try {
      const t = parameterType(p.declarationFragments)
      return t.k === 'metatype' && t.t.k === 'named' && t.t.name === name
    } catch { return false }
  })
  if (param < 0) return undefined
  const choices = bridge.pickable(requirements)
  if (choices.length < 2) return undefined
  const types = requirements.map((c) => {
    const info = c.rhsPrecise ? bridge.index.get(c.rhsPrecise) : undefined
    return info ? `${info.module}.${info.path.join('.')}` : c.rhs
  })
  return { name, param, choices, requirements: types }
}

export function judge(bridge: Bridge, symbol: Symbol, owner: Symbol | undefined): Verdict {
  // ColorSyncBase.h erases CS_UNAVAILABLE_EMBEDDED for __swift__, so the
  // swift graph admits this macos-only global even though neither ios sdk
  // exports it. honor the native declaration before emitting either accessor.
  if (symbol.identifier.precise === 'c:@kColorSyncPreferredCMM') {
    return { covered: false, reason: 'unavailable on iOS: ColorSyncTransform.h declares kColorSyncPreferredCMM CS_UNAVAILABLE_EMBEDDED' }
  }
  // CFBase.h defines this as a special CFAllocatorCreate argument, not an
  // allocator object. its sentinel address (0x3ab) cannot enter an ARC-owned
  // handle. keep the unsupported symbol visible in coverage, never a getter
  // that would eagerly retain it when CoreFoundation is imported.
  if (symbol.identifier.precise === 'c:@kCFAllocatorUseContext') {
    return { covered: false, reason: 'non-object C pointer sentinel cannot be retained as an SDK handle' }
  }
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
      const defaults = parameterDefaults(symbol.declarationFragments ?? [])
      const pick = pickOf(bridge, symbol, owner, generics)
      for (const [i, parameter] of (signature?.parameters ?? []).entries()) {
        if (pick?.param === i) continue
        const b = bridge.type(parameterType(parameter.declarationFragments), 'input', generics)
        // a call leaves a defaulted parameter out, so its type need not bridge
        if (!b.ok && defaults[i] === undefined) return { covered: false, reason: b.reason }
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
