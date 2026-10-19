// emits the swift half of a framework's bindings: a table that calls each
// bridged symbol by number, and conformances that give the framework's enums,
// option sets and raw-value constants their javascript form. swift infers each
// argument's type from the call, so the table names types only to pick an
// overload.
import { Bridge, OBSERVABLE, cErrorOut, inUniverse, judge, outPointee, callbackOut, pickOf, unmanagedReturn, type DeclarationInfo, type Generics } from './bridge'
import type { Fragment, Graph, Symbol } from './graph'
import { parameterDefaults, parameterType, parseType, typeText, type SwiftType } from './types'
import { emitProtocols } from './emit-protocols'
import { assignEntryIds } from './identity'

export type Entry = {
  id: number
  key: string
  usr: string
  owner?: string
  name: string
  kind: 'init' | 'method' | 'static' | 'function' | 'get' | 'set' | 'subscript'
  isAsync: boolean
  main: boolean
  // an out parameter takes no argument; its written value comes back under its name
  // typeNames: a generic parameter's type the caller names, from these choices
  params: { label: string; name: string; type: SwiftType; optional: boolean; hasDefault: boolean; out?: boolean; inout?: boolean; keyPaths?: string[]; typeNames?: string[] }[]
  returns?: SwiftType
  // the concrete witness for each generic parameter and associated type.
  specialization?: Record<string, SwiftType>
  receiver?: SwiftType
  syncCallbacks?: boolean
  // how react observes this getter: key-value observing for an objective-c
  // property, observation tracking for a property of an Observable class
  observation?: 'kvo' | 'tracking'
  swift: string
}

export type Skipped = { usr: string; path: string; reason: string }

export type ModuleOutput = { module: string; entries: Entry[]; skipped: Skipped[]; swift: string }

const text = (fragments: Fragment[] = []) => fragments.map((f) => f.spelling).join('')

// swift reserves few words after a dot or as an argument label; escape only those
const AFTER_DOT = new Set(['init', 'self', 'Self', 'Type', 'Protocol'])
const LABELS = new Set(['inout', 'var', 'let'])
const KEYWORDS = new Set(['associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init',
  'inout', 'internal', 'let', 'open', 'operator', 'private', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript',
  'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough', 'for', 'guard', 'if', 'in',
  'repeat', 'return', 'switch', 'where', 'while', 'as', 'Any', 'catch', 'false', 'is', 'nil', 'super', 'self', 'Self', 'throw',
  'throws', 'true', 'try', 'Type', 'Protocol'])
const escape = (name: string, reserved: Set<string>) => {
  const bare = name.replace(/`/g, '')
  return reserved.has(bare) ? `\`${bare}\`` : bare
}
const quote = (name: string) => escape(name, KEYWORDS)
const member = (name: string) => escape(name, AFTER_DOT)
const label = (name: string) => escape(name, LABELS)

// `scanForPeripherals(withServices:options:)` -> base and labels
export function splitTitle(title: string) {
  const open = title.indexOf('(')
  if (open < 0) return { base: title, labels: [] as string[] }
  const inner = title.slice(open + 1, title.lastIndexOf(')'))
  return { base: title.slice(0, open), labels: inner ? inner.split(':').slice(0, -1) : [] }
}

function isVoid(fragments?: Fragment[]) {
  const t = text(fragments).trim()
  return !t || t === '()' || t === 'Void'
}

function swiftTypeText(fragments: Fragment[]) {
  return text(fragments).trim()
    .replace(/^@escaping\s*/, '')
    .replace(/\b(__owned|__shared|borrowing|consuming|sending)\s+/g, '')
    // an implicitly unwrapped optional is spelled as an optional outside a declaration
    .replace(/([\w\])>])!/g, '$1?')
    .trim()
}

// the type fragments of a parameter, without its name
function parameterTypeFragments(fragments: Fragment[]): Fragment[] {
  const colon = fragments.findIndex((f) => f.kind === 'text' && f.spelling.includes(':'))
  const rest = colon < 0 ? fragments : fragments.slice(colon)
  const head = rest[0]
  const after = colon < 0 ? head.spelling : head.spelling.slice(head.spelling.indexOf(':') + 1)
  return [...(after.trim() ? [{ ...head, spelling: after }] : []), ...rest.slice(1)]
}

function functionOf(type: SwiftType): { fn: Extract<SwiftType, { k: 'function' }>; optional: boolean } | null {
  if (type.k === 'function') return { fn: type, optional: false }
  if (type.k === 'optional' && type.t.k === 'function') return { fn: type.t, optional: true }
  return null
}

function swiftType(type: SwiftType): string {
  if (type.k === 'optional') return `(${swiftType(type.t)})?`
  if (type.k === 'function') return `${type.sendable ? '@Sendable ' : ''}(${type.params.map((p) => `${p.t.k === 'function' && p.t.escaping ? '@escaping ' : ''}${swiftType(p.t)}`).join(', ')})${type.async ? ' async' : ''}${type.throws ? ' throws' : ''} -> ${swiftType(type.result)}`
  if (type.k === 'array') return `[${swiftType(type.t)}]`
  if (type.k === 'dictionary') return `[${swiftType(type.key)}: ${swiftType(type.value)}]`
  if (type.k === 'tuple') return `(${type.items.map((p) => `${p.label ? `${p.label}: ` : ''}${swiftType(p.t)}`).join(', ')})`
  if (type.k === 'named') return `${type.name}${type.args.length ? `<${type.args.map(swiftType).join(', ')}>` : ''}`
  return typeText(type)
}

// a plain instance getter body, the only shape a key path can observe
function observedGetter(e: Entry) {
  return `let o: ${swiftType(e.receiver!)} = try c.receiver(); return c.out(o.${member(e.name)})`
}

function needsOutputConversion(type: SwiftType): boolean {
  if (type.k === 'function' || type.k === 'tuple') return true
  if (type.k === 'array' || type.k === 'optional') return needsOutputConversion(type.t)
  if (type.k === 'dictionary') return needsOutputConversion(type.value)
  return false
}

function usesObjcOpen(type: SwiftType, open: Set<string>): boolean {
  switch (type.k) {
    case 'named':
      return (!type.args.length && open.has(type.name)) || type.args.some((a) => usesObjcOpen(a, open))
    case 'optional': case 'array': case 'variadic': case 'inout': case 'metatype': case 'existential':
      return usesObjcOpen(type.t, open)
    case 'dictionary':
      return usesObjcOpen(type.key, open) || usesObjcOpen(type.value, open)
    case 'tuple':
      return type.items.some((i) => usesObjcOpen(i.t, open))
    case 'function':
      return type.params.some((p) => usesObjcOpen(p.t, open)) || usesObjcOpen(type.result, open)
    case 'composition':
      return type.items.some((i) => usesObjcOpen(i, open))
  }
}

// keep the native function typed until its arguments and result have crossed the wire.
export function outputValue(type: SwiftType, value: string): string {
  if (!needsOutputConversion(type)) return value
  if (type.k === 'optional' || type.k === 'array') return `(${value}).map { v in ${outputValue(type.t, 'v')} }`
  if (type.k === 'dictionary') return `(${value}).mapValues { v in ${outputValue(type.value, 'v')} }`
  if (type.k === 'tuple') {
    if (!type.items.length) return 'c.void'
    const values = type.items.map((item, i) => `c.out(${outputValue(item.t, `v.${i}`)})`)
    const named = type.items.every((item) => item.label)
    const encoded = named
      ? `[${values.map((v, i) => `${JSON.stringify(type.items[i].label)}: ${v}`).join(', ')}] as [String: Any]`
      : `[${values.join(', ')}] as [Any]`
    // evaluate a getter or async result once and preserve each element's
    // declared class type through out's class-preserving overload.
    return `({ (v: ${swiftType(type)}) in ${encoded} })(${value})`
  }
  if (type.k !== 'function') return value
  const args = type.params.map((p, i) => {
    const callback = functionOf(p.t)
    if (callback) {
      const names = callback.fn.params.map((_, n) => `a${n}`)
      const closure = `({ [f = try c.callback(${i})] ${names.length ? `${names.join(', ')} in ` : 'in '}f(${names.map((n, at) => outputValue(callback.fn.params[at].t, n)).join(', ')}) } as ${swiftType(callback.fn)})`
      return callback.optional ? `(c.has(${i}) ? ${closure} : nil)` : closure
    }
    return `(try c.arg(${i}) as ${swiftType(p.t)})`
  })
  const invoke = `${type.throws ? 'try ' : ''}await f(${args.join(', ')})`
  const voidResult = type.result.k === 'named' && type.result.name === 'Void' || type.result.k === 'tuple' && !type.result.items.length
  const body = voidResult ? `${invoke}; return c.void` : `let r = ${invoke}; return c.out(${outputValue(type.result, 'r')})`
  return `OneSDKCallable.capture(${value}) { f, c in ${body} }`
}

export function introducedOn(symbol: Symbol | undefined): string | undefined {
  const ios = symbol?.availability?.find((a) => a.domain === 'iOS')?.introduced
  return ios ? `${ios.major}.${ios.minor ?? 0}` : undefined
}

export function laterVersion(a: string | undefined, b: string | undefined) {
  if (!a) return b
  if (!b) return a
  const [am, an] = a.split('.').map(Number)
  const [bm, bn] = b.split('.').map(Number)
  return am > bm || (am === bm && an >= bn) ? a : b
}

// the deployment target the bindings compile for; newer symbols check at runtime
export const MINIMUM_IOS = '17.0'

const needsCheck = (version: string | undefined) => !!version && laterVersion(version, MINIMUM_IOS) !== MINIMUM_IOS

export function typeUsrs(type: SwiftType, out: string[] = []): string[] {
  switch (type.k) {
    case 'named':
      if (type.usr) out.push(type.usr)
      type.args.forEach((a) => typeUsrs(a, out))
      break
    case 'optional': case 'array': case 'variadic': case 'inout': case 'metatype':
      typeUsrs(type.t, out)
      break
    case 'existential':
      typeUsrs(type.t, out)
      break
    case 'dictionary':
      typeUsrs(type.key, out)
      typeUsrs(type.value, out)
      break
    case 'tuple':
      type.items.forEach((i) => typeUsrs(i.t, out))
      break
    case 'function':
      type.params.forEach((p) => typeUsrs(p.t, out))
      typeUsrs(type.result, out)
      break
    case 'composition':
      type.items.forEach((i) => typeUsrs(i, out))
      break
  }
  return out
}

// the effects a function declares after its parameter list
function effectsOf(decl: string) {
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

function declarationText(symbol: Symbol) {
  return text(symbol.declarationFragments)
}

function isMainActor(symbol: Symbol | undefined) {
  return !!symbol && /@MainActor\b/.test(declarationText(symbol))
}

// `exclude` names entries (by key) and conformances (by type usr) the compiler
// rejected in an earlier pass, with its reason.
// `conformancesOnly` renders no table, for a framework whose values an app's
// tables pass but whose api the app does not call. `table` is the name the
// runtime finds the table by (the module by default); an app's tables carry
// their generation in it, so a facade never calls a table of another one.
export type EmitOptions = { conformancesOnly?: boolean; table?: string }

export function emitModule(graph: Graph, bridge: Bridge, all: Map<string, Symbol>, exclude = new Map<string, string>(), { conformancesOnly = false, table = graph.module }: EmitOptions = {}): ModuleOutput {
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]))
  const ownerOf = new Map<string, string>()
  const requirements = new Set<string>()
  const members = new Map<string, string[]>()
  for (const rel of graph.relationships) {
    if (rel.kind === 'memberOf') {
      ownerOf.set(rel.source, rel.target)
      members.set(rel.target, [...(members.get(rel.target) ?? []), rel.source])
    }
    if (rel.kind === 'requirementOf' || rel.kind === 'optionalRequirementOf') requirements.add(rel.source)
  }
  const entries: Entry[] = []
  const skipped: Skipped[] = []
  const conformances: string[] = []
  // entries bound inside an extension of their generic owner, by owner
  const opened = new Map<string, { info: DeclarationInfo; value: boolean; bodies: Map<Entry, { body: string; mutates: boolean }> }>()
  const seen = new Set<string>()
  const imports = new Set<string>([graph.module])

  // members of a protocol extension can lack a memberOf relationship; their
  // path still names the owner
  const byPath = new Map<string, string>()
  for (const info of bridge.index.values()) {
    if (info.module === graph.module) byPath.set(info.path.join('.'), info.usr)
  }
  for (const symbol of graph.symbols) {
    const usr = symbol.identifier.precise
    if (!ownerOf.has(usr) && symbol.pathComponents.length > 1) {
      const owner = byPath.get(symbol.pathComponents.slice(0, -1).join('.'))
      if (owner) ownerOf.set(usr, owner)
    }
  }

  const typePaths = new Map([...bridge.index.values()].map((info) => [`${info.module}.${info.path.join('.')}`, info]))

  const lookup = (usr: string) => byUsr.get(usr) ?? all.get(usr)
  const availableFrom = (usr: string, types: SwiftType[]) => {
    let version: string | undefined
    for (let at: string | undefined = usr; at; at = ownerOf.get(at)) version = laterVersion(version, introducedOn(lookup(at)))
    for (const type of types) for (const ref of typeUsrs(type)) version = laterVersion(version, introducedOn(lookup(ref)))
    return version
  }
  const guarded = (version: string | undefined, body: string) =>
    needsCheck(version)
      ? `guard #available(iOS ${version}, *) else { throw OneSDKError.unsupported("this api before iOS ${version}") }; ${body}`
      : body

  // ancestors marked @MainActor make every member main-isolated
  const mainIsolated = (usr: string | undefined): boolean => {
    for (let at = usr; at; at = ownerOf.get(at)) {
      if (isMainActor(byUsr.get(at) ?? all.get(at))) return true
    }
    return false
  }

  for (const symbol of graph.symbols) {
    const usr = symbol.identifier.precise
    if (seen.has(usr)) continue
    seen.add(usr)
    if (!inUniverse(symbol, requirements)) continue
    const kind = symbol.kind.identifier
    const path = symbol.pathComponents.join('.')
    const ownerUsr = ownerOf.get(usr)
    const ownerInfo = ownerUsr ? bridge.index.get(ownerUsr) : undefined
    const ownerSymbol = ownerUsr ? byUsr.get(ownerUsr) ?? all.get(ownerUsr) : undefined

    if (kind === 'swift.enum' || kind === 'swift.struct') {
      if (exclude.has(usr)) {
        skipped.push({ usr, path, reason: exclude.get(usr)! })
        continue
      }
      const conformance = emitConformance(symbol, bridge, members.get(usr) ?? [], byUsr, requirements, availableFrom(usr, []))
      if (conformance) conformances.push(`// conformance ${usr}\n${conformance}`)
      continue
    }
    if (!['swift.init', 'swift.method', 'swift.type.method', 'swift.func', 'swift.property',
      'swift.type.property', 'swift.var', 'swift.subscript'].includes(kind)) continue
    const verdict = judge(bridge, symbol, ownerSymbol)
    if (!verdict.covered) {
      skipped.push({ usr, path, reason: verdict.reason })
      continue
    }
    if ((ownerUsr && !ownerInfo) || (!ownerUsr && symbol.pathComponents.length > 1)) {
      skipped.push({ usr, path, reason: 'owner not in the sdk index' })
      continue
    }
    const generics = bridge.generics(symbol, ownerSymbol)
    const unresolved = [...generics.params].filter((name) => !generics.resolved.has(name) && !generics.objcOpen.has(name))
    if (unresolved.length) {
      skipped.push({ usr, path, reason: `generic${ownerSymbol?.swiftGenerics?.parameters?.length ? ' owner' : ''}: no canonical witness for ${unresolved.join(', ')}` })
      continue
    }
    // objective-c erases generics, so reads go through the first witness while
    // typescript keeps the parameter generic
    const objcErasure = [...generics.objcOpen].length && ownerInfo?.objcWitnesses?.length
      ? bridge.index.get(ownerInfo.objcWitnesses[0])
      : undefined
    const swiftGenerics: Generics = objcErasure
      ? { ...generics, resolved: new Map([...generics.resolved, ...[...generics.objcOpen].map((p): [string, SwiftType] =>
        [p, { k: 'named', name: `${objcErasure.module}.${objcErasure.path.join('.')}`, usr: objcErasure.usr, args: [] }])]) }
      : generics
    const specialization = generics.params.size ? Object.fromEntries(generics.resolved) : undefined
    const ownerParams = new Set((ownerSymbol?.swiftGenerics?.parameters ?? []).map((p) => p.name))
    // generic parameters bound where the entry runs stay open
    const replaceWith = (open: Set<string>) => (source: string) => {
      const names = [...swiftGenerics.resolved.keys()].filter((name) => !open.has(name))
        .sort((a, b) => b.length - a.length)
      if (!names.length) return source
      const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      return source.replace(new RegExp(`(?<![A-Za-z0-9_.])(?:${escaped.join('|')})(?![A-Za-z0-9_])`, 'g'),
        (name) => typeText(bridge.substitute(swiftGenerics.resolved.get(name)!, swiftGenerics)))
    }
    const replaceTypes = replaceWith(new Set())
    const specializedOwner = (info: DeclarationInfo) => {
      const used = new Set<string>()
      return `${info.module}.${info.path.map((name, i) => {
        const at = typePaths.get(`${info.module}.${info.path.slice(0, i + 1).join('.')}`)
        const params = (at?.genericParameters ?? []).filter((p) => !used.has(p))
        params.forEach((p) => used.add(p))
        return quote(name) + (params.length ? `<${params.map((p) => replaceTypes(p)).join(', ')}>` : '')
      }).join('.')}`
    }
    const owner = ownerInfo ? specializedOwner(ownerInfo) : undefined
    // a default value names types relative to the scope that declares it
    const scoped = (expression: string) => !ownerInfo ? expression : expression.replace(/(?<![\w.])[A-Z]\w*/g, (name) => {
      for (let depth = ownerInfo.path.length; depth > 0; depth--) {
        const path = [...ownerInfo.path.slice(0, depth), name]
        if (typePaths.has(`${ownerInfo.module}.${path.join('.')}`)) return `${ownerInfo.module}.${path.map(quote).join('.')}`
      }
      return name
    })
    const receiver: SwiftType | undefined = ownerInfo ? {
      k: 'named', name: `${ownerInfo.module}.${ownerInfo.path.join('.')}`, usr: ownerInfo.usr,
      args: (ownerSymbol?.swiftGenerics?.parameters ?? []).map((p) => bridge.substitute({ k: 'named', name: p.name, args: [] }, generics)),
    } : undefined
    const decl = declarationText(symbol)
    const isStatic = kind === 'swift.type.method' || kind === 'swift.type.property' || /\b(static|class)\s+(func|var|let|subscript)\b/.test(decl)
    if (isStatic && ownerInfo?.kind === 'protocol') {
      skipped.push({ usr, path, reason: 'static protocol member' })
      continue
    }
    const valueOwner = ownerInfo && ownerInfo.kind !== 'class' && ownerInfo.kind !== 'actor' && ownerInfo.kind !== 'protocol'
    const main = mainIsolated(usr)
    const receiverType = ownerInfo?.kind === 'protocol' ? `any ${owner}` : owner
    const { base, labels } = splitTitle(symbol.pathComponents.at(-1)!)
    // an instance member of a generic type binds inside an extension of that
    // type, so one entry serves every specialization rather than only the
    // canonical witness. a member adding generic parameters or constraints
    // cannot, and one the compiler rejects there falls back to the witness.
    // objective-c extensions cannot access generic parameters, so those use
    // erasure instead.
    const ownerConstraints = ownerSymbol?.swiftGenerics?.constraints ?? []
    const openable = !!ownerUsr && !!ownerInfo && ownerParams.size > 0 && ownerInfo.kind !== 'protocol' && !isStatic && !main &&
      !ownerUsr.startsWith('c:objc') &&
      [...generics.params].every((name) => ownerParams.has(name)) &&
      [...(symbol.swiftGenerics?.constraints ?? []), ...(symbol.swiftExtension?.constraints ?? [])]
        .every((c) => ownerConstraints.some((o) => JSON.stringify(o) === JSON.stringify(c))) &&
      !exclude.has(`open:${ownerUsr}`)
    const opens = (key: string) => openable && !exclude.has(`open:${key}`)
    const push = (entry: Entry, open: boolean, mutates = false) => {
      entries.push(entry)
      if (!open) return
      if (!opened.has(ownerUsr!)) opened.set(ownerUsr!, { info: ownerInfo!, value: !!valueOwner, bodies: new Map() })
      opened.get(ownerUsr!)!.bodies.set(entry, { body: entry.swift, mutates })
    }

    if (kind === 'swift.property' || kind === 'swift.type.property' || kind === 'swift.var') {
      const target = kind === 'swift.var' ? `${graph.module}.${member(base)}` : isStatic ? `${owner}.${member(base)}` : `o.${member(base)}`
      const receiverFor = (mutable: boolean, open: boolean) => kind === 'swift.var' || isStatic ? '' : `${mutable ? 'var' : 'let'} o${open ? ' = self' : `: ${receiverType} = try c.receiver()`}; `
      const propertyFragments = symbol.declarationFragments ?? []
      const propertyName = propertyFragments.findIndex((f) => f.kind === 'identifier')
      const colon = propertyFragments.findIndex((f, i) => i > propertyName && f.kind === 'text' && f.spelling.includes(':'))
      const tail = propertyFragments.slice(colon)
      const body = colon < 0 ? [] : [{ ...tail[0], spelling: tail[0].spelling.slice(tail[0].spelling.indexOf(':') + 1) }, ...tail.slice(1)]
      const brace = body.findIndex((f) => f.kind === 'text' && /[{=]/.test(f.spelling))
      const propertyType = body.length ? bridge.functions(bridge.substitute(parseType(brace < 0 ? body : [...body.slice(0, brace), { ...body[brace], spelling: body[brace].spelling.split(/[{=]/)[0] }]), generics)) : undefined
      const propertyVersion = availableFrom(usr, propertyType ? [propertyType] : [])
      const accessor = /\{\s*get\s+([^}]*)\}/.exec(decl)?.[1] ?? ''
      const getAsync = /\basync\b/.test(accessor)
      const getThrows = /\bthrows\b/.test(accessor)
      const getValue = `${getThrows ? 'try ' : ''}${main || getAsync ? 'await ' : ''}${target}`
      const encodedGet = propertyType ? outputValue(propertyType, getValue) : getValue
      const getOpen = opens(`${usr}:get`)
      if (!exclude.has(`${usr}:get`)) push({
        id: 0, key: `${usr}:get`, usr, owner, name: base, kind: 'get', isAsync: getAsync, main, params: [], returns: propertyType, specialization, receiver,
        swift: guarded(propertyVersion, `${receiverFor(false, getOpen)}return c.out(${encodedGet})`),
      }, getOpen)
      else skipped.push({ usr, path, reason: exclude.get(`${usr}:get`)! })
      const readOnly = /\blet\b/.test(decl) || /\{\s*get\b(?![^}]*\bset\b)/.test(decl) || /\bprivate\(set\)/.test(decl)
      if (!readOnly && exclude.has(`${usr}:set`)) skipped.push({ usr, path, reason: exclude.get(`${usr}:set`)! })
      else if (!readOnly) {
        const setOpen = opens(`${usr}:set`)
        // a value receiver is written back: through the call, or to self
        // when the setter is bound inside its owner
        const writeBack = valueOwner && !isStatic && kind !== 'swift.var' ? setOpen ? '; self = o' : '; c.setReceiver(o)' : ''
        // a closure property stores a native closure that calls the javascript
        // function later, as an escaping callback argument does
        const fn = propertyType && functionOf(propertyType)
        if (fn && (fn.fn.async || fn.fn.throws || !(fn.fn.result.k === 'named' && fn.fn.result.name === 'Void' || fn.fn.result.k === 'tuple' && !fn.fn.result.items.length) || fn.fn.params.some((p) => callbackOut(p.t)))) {
          skipped.push({ usr, path, reason: 'closure property answers its caller' })
          continue
        }
        const names = fn ? fn.fn.params.map((_, n) => `p${n}`) : []
        const closure = fn ? `{ ${names.length ? `${names.join(', ')} in ` : ''}f(${names.map((n, at) => outputValue(fn.fn.params[at].t, n)).join(', ')}) }` : ''
        // typed first, so the compiler never infers the closure through the optional
        const fetch = !fn ? ''
          : fn.optional ? `let v: ${swiftType(propertyType!)}; if c.has(0) { let f = try c.callback(0); v = ${closure} } else { v = nil }; `
          : `let f = try c.callback(0); let v: ${swiftType(fn.fn)} = ${closure}; `
        const value = fn ? 'v' : 'try c.arg(0)'
        push({
          id: 0, key: `${usr}:set`, usr, owner, name: base, kind: 'set', isAsync: false, main, params: propertyType ? [{ label: '_', name: 'value', type: propertyType, optional: propertyType.k === 'optional', hasDefault: false }] : [], specialization, receiver,
          swift: guarded(propertyVersion, `${receiverFor(!!valueOwner, setOpen)}${fetch}${target} = ${value}${writeBack}; return c.void`),
        }, setOpen, !!valueOwner)
      }
      continue
    }

    const mutating = /\bmutating\b/.test(decl)
    const open = (kind === 'swift.method' || kind === 'swift.subscript') && opens(usr)
    const writeBack = open ? 'self = o' : 'c.setReceiver(o)'
    const parameters = symbol.functionSignature?.parameters ?? []
    // an objective-c initializer over an open parameter switches on the value's
    // witness; anything but a single direct value stays out for now
    if (kind === 'swift.init' && [...generics.objcOpen].length && ownerInfo?.objcWitnesses?.length) {
      const genericAt = parameters.flatMap((p, i) => {
        try {
          const t = parameterType(p.declarationFragments)
          return t.k === 'named' && !t.args.length && generics.objcOpen.has(t.name) ? [i] : []
        } catch { return [] }
      })
      if (genericAt.length === 1) {
        const witnesses = ownerInfo.objcWitnesses.map((u) => bridge.index.get(u)).filter((i): i is DeclarationInfo => !!i)
        if (witnesses.length === ownerInfo.objcWitnesses.length) {
          const at = genericAt[0]
          const defaults = parameterDefaults(symbol.declarationFragments ?? [])
          const entryParams: Entry['params'] = []
          const hoisted: string[] = []
          const fixed: string[] = []
          let simple = true
          parameters.forEach((parameter, i) => {
            const argLabel = labels[i] ?? '_'
            const prefix = argLabel === '_' ? '' : `${label(argLabel)}: `
            const name = parameter.internalName ?? parameter.name
            if (i === at) {
              entryParams.push({ label: argLabel, name, type: parameterType(parameter.declarationFragments), optional: false, hasDefault: false })
              hoisted.push(`let v${i}: Any = try c.arg(${entryParams.length - 1})`)
              return
            }
            // only plain values beside the switched one for now
            let type: SwiftType
            try {
              type = bridge.functions(bridge.substitute(parameterType(parameter.declarationFragments), generics))
            } catch { simple = false; return }
            if (usesObjcOpen(type, generics.objcOpen) || type.k === 'function' || type.k === 'variadic' || type.k === 'inout' || outPointee(type)) { simple = false; return }
            const defaultValue = defaults[i]
            if (defaultValue?.startsWith('#') || !bridge.type(parameterType(parameter.declarationFragments), 'input', generics).ok) { simple = false; return }
            const spelled = replaceTypes(swiftTypeText(parameterTypeFragments(parameter.declarationFragments)).replace(/^inout\s+/, ''))
            for (const ref of typeUsrs(type)) {
              const module = bridge.index.get(ref)?.module
              if (module) imports.add(module)
            }
            entryParams.push({ label: argLabel, name, type, optional: type.k === 'optional', hasDefault: defaultValue !== undefined })
            const value = defaultValue !== undefined
              ? `try c.arg(${entryParams.length - 1}, or: ${replaceTypes(scoped(defaultValue))})`
              : `try c.arg(${entryParams.length - 1})`
            hoisted.push(`let a${i} = (${value} as ${spelled})`)
            fixed.push(`${prefix}a${i}`)
          })
          if (simple) {
            for (const w of witnesses) imports.add(w.module)
            const qualified = (w: DeclarationInfo) => `${w.module}.${w.path.map(quote).join('.')}`
            const ownerBase = `${ownerInfo.module}.${ownerInfo.path.map(quote).join('.')}`
            const valueLabel = labels[at] ?? '_'
            const valuePrefix = valueLabel === '_' ? '' : `${label(valueLabel)}: `
            // fixed arguments keep declaration order around the switched value
            const branchArgs = (w: string) => parameters.map((_, i) => {
              if (i === at) return `${valuePrefix}x`
              const fixedAt = fixed[parameters.slice(0, i).filter((_, j) => j !== at).length]
              return fixedAt
            }).join(', ')
            const expected = witnesses.map((w) => w.path.join('.')).join(' | ')
            const cases = witnesses.map((w) =>
              `case let x as ${qualified(w)}: return c.out(${ownerBase}<${qualified(w)}>(${branchArgs(qualified(w))}))`).join('; ')
            const body = [...hoisted, `switch v${at} { ${cases}; default: throw OneSDKError.badArgument(index: ${at}, expected: ${JSON.stringify(expected)}, got: String(describing: type(of: v${at}))) }`].join('; ')
            push({
              id: 0, key: usr, usr, owner, name: base, kind: 'init', isAsync: false, main, params: entryParams,
              specialization, receiver, swift: guarded(availableFrom(usr, [...entryParams.map((p) => p.type), ...witnesses.map((w): SwiftType =>
                ({ k: 'named', name: `${w.module}.${w.path.join('.')}`, usr: w.usr, args: [] }))]), body),
            }, false)
            continue
          }
        }
        skipped.push({ usr, path, reason: 'objc generic init needs witnesses' })
        continue
      } else if (genericAt.length > 1) {
        skipped.push({ usr, path, reason: 'objc generic init needs a single value' })
        continue
      }
    }
    // an objective-c method taking an open parameter would narrow it to the
    // erasure witness; those need their own switch, still out
    if ((kind === 'swift.method' || kind === 'swift.subscript') && [...generics.objcOpen].length &&
      parameters.some((p) => { try { return usesObjcOpen(parameterType(p.declarationFragments), generics.objcOpen) } catch { return false } })) {
      skipped.push({ usr, path, reason: 'objc generic method needs a witness switch' })
      continue
    }
    // a caller-named generic runs a local generic function with P open; one
    // the compiler rejects falls back to the canonical witness, which needs
    // the type parameter to have a default
    const pickable = pickOf(bridge, symbol, ownerSymbol, generics)
    const pick = pickable && !exclude.has(`pick:${usr}`) ? pickable : undefined
    if (pickable && !pick && parameterDefaults(symbol.declarationFragments ?? [])[pickable.param] === undefined) {
      skipped.push({ usr, path, reason: exclude.get(`pick:${usr}`)! })
      continue
    }
    const replace = open ? replaceWith(new Set([...ownerParams, 'Self'])) : pick ? replaceWith(new Set([pick.name])) : replaceTypes
    let pickAt = -1
    const hoisted: string[] = []
    const args: string[] = []
    const outs: string[] = []
    const params: Entry['params'] = []
    let reason = ''
    let syncCallbacks = false
    const defaults = parameterDefaults(symbol.declarationFragments ?? [])
    parameters.forEach((parameter, i) => {
      const defaultValue = defaults[i]
      if (pick && i === pick.param) {
        pickAt = params.length
        const argLabel = labels[i] ?? '_'
        params.push({ label: argLabel, name: parameter.internalName ?? parameter.name, type: parameterType(parameter.declarationFragments), optional: false,
          hasDefault: defaultValue !== undefined, typeNames: pick.choices.map((c) => c.name) })
        args.push(`${argLabel === '_' ? '' : `${label(argLabel)}: `}t`)
        return
      }
      // swift fills a parameter the bridge cannot carry, or one defaulting to a
      // caller macro such as #isolation, so javascript never passes it. judge
      // let an unbridgeable parameter through only when it has a default.
      if (defaultValue?.startsWith('#') || !bridge.type(parameterType(parameter.declarationFragments), 'input', generics).ok) return
      const at = params.length
      const fragments = parameterTypeFragments(parameter.declarationFragments)
      const parsed = bridge.functions(bridge.substitute(parameterType(parameter.declarationFragments), generics))
      const type = parsed.k === 'inout' ? parsed.t : parsed
      const argLabel = labels[i] ?? '_'
      const prefix = argLabel === '_' ? '' : `${label(argLabel)}: `
      const spelled = replace(swiftTypeText(fragments)).replace(/^inout\s+/, '')
      if (/\bsome\b/.test(spelled)) reason = 'opaque parameter'
      for (const ref of typeUsrs(type)) {
        const module = bridge.index.get(ref)?.module
        if (module) imports.add(module)
      }
      const name = parameter.internalName ?? parameter.name
      const isInOut = parsed.k === 'inout' || new RegExp(`\\b${name}\\s*:\\s*inout\\b`).test(decl)
      if (isInOut) {
        hoisted.push(`var in${i}: ${spelled} = try c.arg(${at})`)
        outs.push(`${JSON.stringify(name)}: in${i}`)
        params.push({ label: argLabel, name, type, optional: type.k === 'optional', hasDefault: defaultValue !== undefined, inout: true })
        args.push(`${prefix}&in${i}`)
        return
      }
      const written = outPointee(type)
      if (written) {
        // spelled as the pointer, or through an alias such as NSErrorPointer
        const pointee = /^(?:Autoreleasing)?Unsafe\w*Pointer<(.*)>[?!]?$/s.exec(spelled)?.[1] ?? typeText(written)
        hoisted.push(`var out${i}: ${pointee} = ${written.k === 'optional' ? 'nil' : 'false'}`)
        // an unmanaged error transfers its retained value to arc on the way out
        outs.push(cErrorOut(written) ? `${JSON.stringify(name)}: out${i}?.takeRetainedValue()` : `${JSON.stringify(name)}: out${i}`)
        params.push({ label: argLabel, name, type, optional: true, hasDefault: true, out: true })
        args.push(`${prefix}&out${i}`)
        return
      }
      params.push({ label: argLabel, name, type, optional: type.k === 'optional', hasDefault: defaultValue !== undefined })
      const fn = functionOf(type)
      if (fn) {
        if (fn.fn.async) reason = 'async callback'
        const names = fn.fn.params.map((_, n) => `p${n}`)
        const fetch = fn.optional ? `c.has(${at}) ? try c.callback(${at}) : nil` : `try c.callback(${at})`
        hoisted.push(`let f${i} = ${fetch}`)
        const outputs = fn.fn.params.map((p, n) => ({ n, type: callbackOut(p.t) })).filter((p) => !!p.type)
        const callbackVoid = fn.fn.result.k === 'named' && fn.fn.result.name === 'Void' || fn.fn.result.k === 'tuple' && !fn.fn.result.items.length
        const canSync = !main && !effectsOf(decl).isAsync && !fn.fn.escaping && !new RegExp(`\\b${name}\\s*:[^(),]*@escaping\\b`).test(decl)
        const needsSync = outputs.length > 0 || !callbackVoid || fn.fn.throws && canSync
        const values = names.map((n, at) => {
          const written = outputs.find((p) => p.n === at)
          const value = written ? `${n}.pointee${written.type!.k === 'named' && written.type!.name.split('.').at(-1) === 'ObjCBool' ? '.boolValue' : ''}` : outputValue(fn.fn.params[at].t, n)
          return written ? `["$out": ${value}]` : value
        })
        let body: string
        if (needsSync) {
          syncCallbacks = true
          if (!canSync) reason = 'synchronous callback requires a nonescaping JS-thread call'
          const target = `f${i}${fn.optional ? '!' : ''}`
          if (outputs.length) {
            if (!(fn.fn.result.k === 'named' && fn.fn.result.name === 'Void' || fn.fn.result.k === 'tuple' && !fn.fn.result.items.length)) reason = 'stop callback also returns a value'
            const writes = outputs.map(({ n, type }) => `p${n}.pointee = ${type!.k === 'named' && type!.name.split('.').at(-1) === 'ObjCBool' ? `ObjCBool(try r.arg(${n + 1}) as Bool)` : `try r.arg(${n + 1})`}`).join('; ')
            const stops = outputs.map(({ n, type }) => `p${n}.pointee = ${type!.k === 'named' && type!.name.split('.').at(-1) === 'ObjCBool' ? 'ObjCBool(true)' : 'true'}`).join('; ')
            body = `do { let r = try ${target}.response([${values.join(', ')}]); ${writes} } catch { c.failCallback(error); ${stops} }`
          } else if (fn.fn.result.k === 'named' && fn.fn.result.name === 'Void' || fn.fn.result.k === 'tuple' && !fn.fn.result.items.length) body = `_ = try ${target}.response([${values.join(', ')}])`
          else body = `return try ${target}.result([${values.join(', ')}])`
        } else body = `f${i}${fn.optional ? '?' : ''}(${values.join(', ')})`
        const closure = `{ ${names.length ? `${names.join(', ')} in ` : ''}${body} }`
        const bare = spelled.replace(/^\((.*)\)\?$/s, '$1')
        args.push(`${prefix}${fn.optional ? `(f${i} == nil ? nil : (${closure} as ${bare}))` : `(${closure} as ${spelled})`}`)
        return
      }
      if (type.k === 'variadic') {
        reason = 'variadic'
        return
      }
      if (type.k === 'named' && ['KeyPath', 'WritableKeyPath', 'ReferenceWritableKeyPath', 'PartialKeyPath'].includes(type.name.split('.').at(-1)!)) {
        const paths = bridge.keyPaths(type, generics)
        if (paths.length) {
          const root = swiftType(type.args[0])
          const table = paths.map((p) => `${JSON.stringify(p.name)}: \\${root}.${member(p.name)}`).join(', ')
          params[params.length - 1].keyPaths = paths.map((p) => p.name)
          args.push(`${prefix}(try c.keyPath(${at}, [${table}] as [String: ${spelled}]) as ${spelled})`)
          return
        }
      }
      const value = defaultValue !== undefined
        ? `try c.arg(${at}, or: ${replace(scoped(defaultValue))})`
        : `try c.arg(${at})`
      args.push(`${prefix}(${value} as ${spelled})`)
    })
    if (!reason && exclude.has(usr)) reason = exclude.get(usr)!
    if (reason) {
      skipped.push({ usr, path, reason })
      continue
    }
    const { isAsync, throws } = effectsOf(decl)
    const returnsVoid = kind === 'swift.init' ? false : isVoid(symbol.functionSignature?.returns)
    let call: string
    let entryKind: Entry['kind']
    if (kind === 'swift.init') {
      if (!owner || ownerInfo?.kind === 'protocol') {
        skipped.push({ usr, path, reason: 'protocol initializer' })
        continue
      }
      // imported c memberwise initializers can collide with an overlay that
      // spells a field through CGFloat instead of Double. mutable c records
      // have the same memberwise semantics as trivial importer zeroing plus
      // writes. the whole-sdk index rules out custom overlay zero construction.
      const fields = (members.get(ownerUsr!) ?? []).flatMap((usr) => {
        const field = lookup(usr)
        return field?.kind.identifier === 'swift.property' && usr.startsWith(`${ownerUsr}@FI@`) ? [field] : []
      })
      const fieldNames = new Set(fields.map((field) => field.pathComponents.at(-1)!))
      const cZeroInit = (members.get(ownerUsr!) ?? []).some((usr) => {
        const initializer = lookup(usr)
        return usr === ownerInfo?.cZeroInit && initializer?.kind.identifier === 'swift.init'
          && !initializer.swiftExtension && !initializer.synthesizedInit
          && !initializer.functionSignature?.parameters?.length && judge(bridge, initializer, ownerSymbol).covered
      })
      const cMemberwise = ownerUsr?.startsWith('c:@S@') && usr.startsWith('s:So') && !symbol.swiftExtension && cZeroInit
        && parameters.length > 0 && fields.length === parameters.length
        && fields.every((field) => /^var\s/.test(text(field.declarationFragments ?? [])))
        && params.length === parameters.length && !hoisted.length && !outs.length
        && !isAsync && !throws && !syncCallbacks
        && params.every((p) => p.label === p.name && fieldNames.has(p.name) && !p.hasDefault)
      if (cMemberwise) {
        // a function reference fixes the arity: overlay initializers whose
        // parameters all have defaults cannot replace the importer zero init.
        hoisted.push(`var aggregate = (${owner}.init as () -> ${owner})()`)
        params.forEach((p, i) => hoisted.push(`aggregate.${member(p.name)} = ${args[i].slice(`${label(p.label)}: `.length)}`))
        call = 'aggregate'
      } else call = `${owner}(${args.join(', ')})`
      entryKind = 'init'
    } else if (kind === 'swift.subscript') {
      call = `${isStatic ? owner : 'o'}[${args.join(', ')}]`
      entryKind = 'subscript'
    } else if (kind === 'swift.func') {
      call = `${graph.module}.${member(base)}(${args.join(', ')})`
      entryKind = 'function'
    } else {
      call = `${isStatic ? owner : 'o'}.${member(base)}(${args.join(', ')})`
      entryKind = isStatic ? 'static' : 'method'
    }
    const returnType = !returnsVoid && kind !== 'swift.init' ? bridge.functions(bridge.substitute(parseType(symbol.functionSignature?.returns ?? []), generics)) : undefined
    if (specialization && returnType) call = `(${call} as ${replace(swiftTypeText(symbol.functionSignature?.returns ?? []))})`
    const needsReceiver = (entryKind === 'method' || entryKind === 'subscript') && !isStatic
    const lines = [
      ...(needsReceiver ? [`${mutating ? 'var' : 'let'} o${open ? ' = self' : `: ${receiverType} = try c.receiver()`}`] : []),
      ...hoisted,
    ]
    const effects = `${throws ? 'try ' : ''}${isAsync || main ? 'await ' : ''}`
    // an Unmanaged result transfers ownership before crossing: +1 for Create and
    // Copy, +0 for Get; anything else stays a handle
    const unmanaged = returnType ? unmanagedReturn(returnType, base) : undefined
    const taken = unmanaged
      ? `r${returnType!.k === 'optional' ? '?' : ''}.take${unmanaged.retained ? 'Retained' : 'Unretained'}Value()`
      : 'r'
    const returned = returnType ? outputValue(unmanaged?.inner ?? returnType, unmanaged ? taken : 'r') : 'r'
    if (outs.length) {
      lines.push(returnsVoid ? `${effects}${call}` : `let r = ${effects}${call}`)
      if (syncCallbacks) lines.push('try c.checkCallbacks()')
      if (mutating) lines.push(writeBack)
      lines.push(`return c.outs(${returnsVoid ? 'nil' : returned}, [${outs.join(', ')}])`)
    } else if (returnsVoid) {
      lines.push(`${effects}${call}`)
      if (syncCallbacks) lines.push('try c.checkCallbacks()')
      if (mutating) lines.push(writeBack)
      lines.push('return c.void')
    } else if (unmanaged || mutating || syncCallbacks || returnType && needsOutputConversion(returnType)) {
      lines.push(`let r = ${effects}${call}`)
      if (syncCallbacks) lines.push('try c.checkCallbacks()')
      if (mutating) lines.push(writeBack)
      lines.push(`return c.out(${returned})`)
    } else {
      lines.push(`return c.out(${effects}${call})`)
    }
    let body = lines.join('; ')
    let entrySpecialization = specialization
    let entryReturns = returnType
    if (pick && pickAt >= 0) {
      // javascript names the type; its value types read as unknown
      const any: SwiftType = { k: 'named', name: 'Any', args: [] }
      const chosen: Generics = { ...generics, resolved: new Map([...generics.resolved, [pick.name, any]]) }
      entrySpecialization = Object.fromEntries(chosen.resolved)
      entryReturns = returnType && bridge.functions(bridge.substitute(parseType(symbol.functionSignature?.returns ?? []), chosen))
      const waits = isAsync || main
      const fallback = pick.choices.find((c) => c.name === 'String') ?? pick.choices[0]
      const name = defaults[pick.param] !== undefined ? `try c.arg(${pickAt}, or: ${JSON.stringify(fallback.name)}) as String` : `try c.arg(${pickAt}) as String`
      body = `func oneSDKPick<${pick.name}: ${pick.requirements.join(' & ')}>(_ t: ${pick.name}.Type) ${waits ? 'async ' : ''}throws -> Any { ${body} }; ` +
        `let type: String = ${name}; switch type { ${pick.choices.map((c) => `case ${JSON.stringify(c.name)}: return try ${waits ? 'await ' : ''}oneSDKPick(${c.swift}.self)`).join('; ')}; ` +
        `default: throw OneSDKError.badArgument(index: ${pickAt}, expected: ${JSON.stringify(pick.choices.map((c) => c.name).join(' | '))}, got: type) }`
    }
    push({
      id: 0, key: usr, usr, owner, name: base, kind: entryKind, isAsync, main, params, specialization: entrySpecialization, receiver, syncCallbacks: syncCallbacks || undefined,
      returns: entryReturns,
      swift: guarded(availableFrom(usr, [...params.map((p) => p.type), ...(returnType ? [returnType] : []), ...Object.values(open || pick ? {} : specialization ?? {})]), body),
    }, open, mutating)
  }

  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  assignEntryIds(entries)
  // the table opens the receiver as the owner's protocol, whose extension
  // holds the member bodies with the owner's generic parameters in scope
  const openings = [...opened].map(([ownerUsr, { info, value, bodies }]) => {
    const protocol = `OneSDKOpen_${graph.module}_${info.path.join('_').replace(/\W/g, '_')}`
    // a member writing a value receiver goes through a mutating requirement,
    // and the table writes the opened value back to the handle
    const method = ({ isAsync }: Entry, mutates: boolean) => `${mutates ? 'Mutate' : ''}${isAsync ? 'Async' : mutates ? '' : 'Sync'}`
    const signature = (name: string, conforming: boolean) =>
      `${name.startsWith('Mutate') && (value || !conforming) ? 'mutating ' : ''}func oneSDK${name}(_ id: Int, _ c: OneSDKCall) ${name.endsWith('Async') ? 'async ' : ''}throws -> Any`
    const names = ['Sync', 'Async', 'Mutate', 'MutateAsync']
    const methods = names.map((name) => {
      const cases = [...bodies].filter(([entry, { mutates }]) => method(entry, mutates) === name).sort(([a], [b]) => a.id - b.id)
        .map(([entry, { body }]) => `    case ${entry.id}: ${body}`)
      return `  ${signature(name, true)} {
    switch id {
${cases.map((line) => `${line}\n`).join('')}    default: throw OneSDKError.unknownSymbol("${graph.module}.\\(id)")
    }
  }`
    })
    for (const [entry, { mutates }] of bodies) {
      const call = `try ${entry.isAsync ? 'await ' : ''}o.oneSDK${method(entry, mutates)}(${entry.id}, c)`
      entry.swift = mutates
        ? `var o: any ${protocol} = try c.receiver(); let r = ${call}; c.setReceiver(o); return r`
        : `let o: any ${protocol} = try c.receiver(); return ${call}`
    }
    const version = availableFrom(ownerUsr, [])
    return `// open ${ownerUsr}
protocol ${protocol} {
${names.map((name) => `  ${signature(name, false)}`).join('\n')}
}
${needsCheck(version) ? `@available(iOS ${version}, *)\n` : ''}extension ${info.module}.${info.path.map(quote).join('.')}: ${protocol} {
${methods.join('\n')}
}`
  })
  // decided here, while swift bodies exist; app manifests keep only the kind
  for (const e of entries) {
    if (e.kind !== 'get' || e.isAsync || e.receiver?.k !== 'named' || !e.swift.includes(observedGetter(e)) || /(?:try|await) o\./.test(e.swift)) continue
    if (e.usr.startsWith('c:objc(')) e.observation = 'kvo'
    else if (bridge.index.get(e.receiver.usr ?? '')?.conformsTo?.includes(OBSERVABLE)) e.observation = 'tracking'
  }
  return { module: graph.module, entries, skipped, swift: renderSwift(graph.module, table, [...imports].sort(), conformancesOnly ? [] : entries, [...conformances, ...(conformancesOnly ? [] : openings)], () => emitProtocols(graph, bridge, all, exclude, skipped)) }
}

function emitConformance(symbol: Symbol, bridge: Bridge, memberUsrs: string[], byUsr: Map<string, Symbol>, requirements: Set<string>, typeVersion: string | undefined) {
  const info = bridge.index.get(symbol.identifier.precise)
  if (!info || symbol.swiftGenerics?.parameters?.length) return null
  const type = `${info.module}.${info.path.map(quote).join('.')}`
  const visible = memberUsrs.map((usr) => byUsr.get(usr)).filter((m): m is Symbol => !!m && inUniverse(m, requirements))
  const versionOf = new Map(visible.map((m) => [m.pathComponents.at(-1)!, introducedOn(m)]))
  // members newer than the type join the list only where they exist
  const list = (names: string[]) => {
    const always = names.filter((n) => !needsCheck(laterVersion(versionOf.get(n), typeVersion)) || laterVersion(typeVersion, versionOf.get(n)) === typeVersion)
    const later = names.filter((n) => !always.includes(n))
    const literal = (ns: string[]) => `[${ns.map((n) => `(${JSON.stringify(n)}, .${member(n)})`).join(', ')}]`
    if (!later.length) return literal(always)
    return `{ var out: [(String, Self)] = ${literal(always)}; ${later.map((n) => `if #available(iOS ${versionOf.get(n)}, *) { out.append((${JSON.stringify(n)}, .${member(n)})) }`).join('; ')}; return out }()`
  }
  const available = needsCheck(typeVersion) ? `@available(iOS ${typeVersion}, *)\n` : ''
  if (info.kind === 'enum' && info.cases?.length && !info.payload) {
    const cases = visible.filter((m) => m.kind.identifier === 'swift.enum.case').map((m) => m.pathComponents.at(-1)!)
    if (!cases.length) return null
    return `${available}extension ${type}: @retroactive OneSDKNamedCases {\n  public static var oneSDKCases: [(String, Self)] { ${list(cases)} }\n}`
  }
  const constants = visible
    .filter((m) => m.kind.identifier === 'swift.type.property' &&
      m.declarationFragments?.some((f) => f.kind === 'typeIdentifier' && f.preciseIdentifier === info.usr))
    .map((m) => m.pathComponents.at(-1)!)
  if (info.optionSet) {
    return `${available}extension ${type}: @retroactive OneSDKNamedOptions {\n  public static var oneSDKOptions: [(String, Self)] { ${list(constants)} }\n}`
  }
  if (info.rawValue && info.kind === 'struct') {
    return `${available}extension ${type}: @retroactive OneSDKNamedConstants {\n  public static var oneSDKConstants: [(String, Self)] { ${list(constants)} }\n}`
  }
  return null
}

const CHUNK = 200

// the runtime keys what a call retains by argument name: a setter by its
// property and other entries by parameter, so init(delegate:) and the
// delegate setter fill one slot. out parameters take no argument.
const argumentNames = (e: Entry) => e.kind === 'set' ? [e.name] : e.params.filter((p) => !p.out).map((p) => p.name)

function renderSwift(module: string, table: string, imports: string[], entries: Entry[], conformances: string[], protocols: () => string) {
  // range dispatch requires numeric order even when the SDK prunes symbols.
  entries = [...entries].sort((a, b) => a.id - b.id)
  const name = `OneSDK_${module}`
  const sync = entries.filter((e) => !e.isAsync && !e.main)
  const async = entries.filter((e) => e.isAsync || e.main)
  // actor-isolated defaults such as #isolation are evaluated in the caller context.
  const chunks = (list: Entry[], isAsync: boolean) => {
    const out: string[] = []
    for (let at = 0; at < list.length; at += CHUNK) {
      const slice = list.slice(at, at + CHUNK)
      out.push(`  static func ${isAsync ? 'async' : 'sync'}${at / CHUNK}(_ id: Int, _ c: OneSDKCall) ${isAsync ? 'async ' : ''}throws -> Any {
    switch id {
${slice.map((e) => `    case ${e.id}: ${e.main ? `return try await { @MainActor in ${e.swift} }()` : e.swift}`).join('\n')}
    default: throw OneSDKError.unknownSymbol("${module}.\\(id)")
    }
  }`)
    }
    return out
  }
  const observed = entries.flatMap((e) => {
    if (!e.observation || !e.receiver) return []
    const type = swiftType(e.receiver)
    const path = String.fromCharCode(92) + type + '.' + member(e.name)
    const swift = e.swift.replace(observedGetter(e),
      `let o: ${type} = try c.receiver(); return try OneSDKObservations.${e.observation}(o, ${path}, emit)`)
    return swift === e.swift ? [] : [{ ...e, swift }]
  })
  const observations: string[] = []
  for (let at = 0; at < observed.length; at += CHUNK) {
    const slice = observed.slice(at, at + CHUNK)
    observations.push(`  @MainActor static func observe${at / CHUNK}(_ id: Int, _ c: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription {
    switch id {
${slice.map((e) => `    case ${e.id}: ${e.swift}`).join('\n')}
    default: throw OneSDKError.unsupported("observable property ${module}.\\(id)")
    }
  }`)
  }
  const named = entries.filter((e) => argumentNames(e).length)
  const names: string[] = []
  for (let at = 0; at < named.length; at += CHUNK) {
    const slice = named.slice(at, at + CHUNK)
    names.push(`  static func names${at / CHUNK}(_ id: Int) -> [String]? {
    switch id {
${slice.map((e) => `    case ${e.id}: return ${JSON.stringify(argumentNames(e))}`).join('\n')}
    default: return nil
    }
  }`)
  }
  const dispatch = (list: Entry[], isAsync: boolean) => {
    const groups: string[] = []
    for (let at = 0; at < list.length; at += CHUNK) {
      const slice = list.slice(at, at + CHUNK)
      groups.push(`    if id >= ${slice[0].id} && id <= ${slice.at(-1)!.id} { return try ${isAsync ? 'await ' : ''}${isAsync ? 'async' : 'sync'}${at / CHUNK}(id, c) }`)
    }
    return groups
  }
  return `// generated by packages/one/codegen/sdk/emit.ts; do not edit
import Foundation
import One
${imports.filter((m) => m !== 'Foundation').map((m) => `import ${m}`).join('\n')}

${conformances.join('\n\n')}

@objc(OneSDKTable_${table}) final class OneSDKTable_${module}: NSObject, OneSDKTable {
  @MainActor func observe(_ id: Int, _ call: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription { try ${name}.observe(id, call, emit) }
  func argumentNames(_ id: Int) -> [String] { ${name}.argumentNames(id) }
  func sync(_ id: Int, _ call: OneSDKCall) throws -> Any { try ${name}.sync(id, call) }
  func async(_ id: Int, _ call: OneSDKCall) async throws -> Any { try await ${name}.async(id, call) }
}

enum ${name} {
  @MainActor static func observe(_ id: Int, _ c: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription {
${observations.map((_, i) => { const slice = observed.slice(i * CHUNK, (i + 1) * CHUNK); return `    if id >= ${slice[0].id} && id <= ${slice.at(-1)!.id} { return try observe${i}(id, c, emit) }` }).join('\n')}
    throw OneSDKError.unsupported("observable property ${module}.\\(id)")
  }

  static func argumentNames(_ id: Int) -> [String] {
${names.map((_, i) => { const slice = named.slice(i * CHUNK, (i + 1) * CHUNK); return `    if id >= ${slice[0].id} && id <= ${slice.at(-1)!.id} { return names${i}(id) ?? [] }` }).join('\n')}
    return []
  }

  static func sync(_ id: Int, _ c: OneSDKCall) throws -> Any {
${dispatch(sync, false).join('\n')}
    throw OneSDKError.unknownSymbol("${module}.\\(id)")
  }

  static func async(_ id: Int, _ c: OneSDKCall) async throws -> Any {
${dispatch(async, true).join('\n')}
    throw OneSDKError.unknownSymbol("${module}.\\(id)")
  }

${[...names, ...observations, ...chunks(sync, false), ...chunks(async, true)].join('\n\n')}
}

${protocols()}
`
}
