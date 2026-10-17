// emits the swift half of a framework's bindings: a table that calls each
// bridged symbol by number, and conformances that give the framework's enums,
// option sets and raw-value constants their javascript form. swift infers each
// argument's type from the call, so the table names types only to pick an
// overload.
import { Bridge, inUniverse, judge, outPointee, type DeclarationInfo } from './bridge'
import type { Fragment, Graph, Symbol } from './graph'
import { parameterType, parseType, typeText, type SwiftType } from './types'

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
  params: { label: string; name: string; type: SwiftType; optional: boolean; hasDefault: boolean; out?: boolean }[]
  returns?: SwiftType
  // the concrete witness for each generic parameter and associated type.
  specialization?: Record<string, SwiftType>
  receiver?: SwiftType
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
  return text(fragments)
    .replace(/@escaping\s*/g, '')
    .replace(/\b(__owned|__shared|borrowing|consuming|sending)\s+/g, '')
    // an implicitly unwrapped optional is spelled as an optional outside a declaration
    .replace(/([\w\])>])!/g, '$1?')
    .trim()
}

// the type fragments of a parameter, without its name or default value
function parameterTypeFragments(fragments: Fragment[]): { fragments: Fragment[]; defaultValue?: string } {
  const colon = fragments.findIndex((f) => f.kind === 'text' && f.spelling.includes(':'))
  const rest = colon < 0 ? fragments : fragments.slice(colon)
  const head = rest[0]
  const after = colon < 0 ? head.spelling : head.spelling.slice(head.spelling.indexOf(':') + 1)
  const body = [...(after.trim() ? [{ ...head, spelling: after }] : []), ...rest.slice(1)]
  const equals = body.findIndex((f) => f.kind === 'text' && /(^|\s)=\s/.test(f.spelling))
  if (equals < 0) return { fragments: body }
  const [before, ...defaults] = body[equals].spelling.split(/\s=\s/)
  return {
    fragments: [...body.slice(0, equals), { ...body[equals], spelling: before }],
    defaultValue: (defaults.join(' = ') + text(body.slice(equals + 1))).trim(),
  }
}

function functionOf(type: SwiftType): { fn: Extract<SwiftType, { k: 'function' }>; optional: boolean } | null {
  if (type.k === 'function') return { fn: type, optional: false }
  if (type.k === 'optional' && type.t.k === 'function') return { fn: type.t, optional: true }
  return null
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

function typeUsrs(type: SwiftType, out: string[] = []): string[] {
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
export function emitModule(graph: Graph, bridge: Bridge, all: Map<string, Symbol>, exclude = new Map<string, string>()): ModuleOutput {
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
    const unresolved = [...generics.params].filter((name) => !generics.resolved.has(name))
    if (unresolved.length) {
      skipped.push({ usr, path, reason: `generic${ownerSymbol?.swiftGenerics?.parameters?.length ? ' owner' : ''}: no canonical witness for ${unresolved.join(', ')}` })
      continue
    }
    const specialization = generics.params.size ? Object.fromEntries(generics.resolved) : undefined
    const replaceTypes = (source: string) => {
      if (!generics.resolved.size) return source
      const names = [...generics.resolved.keys()].sort((a, b) => b.length - a.length)
      const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      return source.replace(new RegExp(`(?<![A-Za-z0-9_.])(?:${escaped.join('|')})(?![A-Za-z0-9_])`, 'g'),
        (name) => typeText(bridge.substitute(generics.resolved.get(name)!, generics)))
    }
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

    if (kind === 'swift.property' || kind === 'swift.type.property' || kind === 'swift.var') {
      const target = kind === 'swift.var' ? `${graph.module}.${member(base)}` : isStatic ? `${owner}.${member(base)}` : `o.${member(base)}`
      const receiverFor = (mutable: boolean) => kind === 'swift.var' || isStatic ? '' : `${mutable ? 'var' : 'let'} o: ${receiverType} = try c.receiver(); `
      const propertyFragments = symbol.declarationFragments ?? []
      const propertyName = propertyFragments.findIndex((f) => f.kind === 'identifier')
      const colon = propertyFragments.findIndex((f, i) => i > propertyName && f.kind === 'text' && f.spelling.includes(':'))
      const tail = propertyFragments.slice(colon)
      const body = colon < 0 ? [] : [{ ...tail[0], spelling: tail[0].spelling.slice(tail[0].spelling.indexOf(':') + 1) }, ...tail.slice(1)]
      const brace = body.findIndex((f) => f.kind === 'text' && /[{=]/.test(f.spelling))
      const propertyType = body.length ? bridge.substitute(parseType(brace < 0 ? body : [...body.slice(0, brace), { ...body[brace], spelling: body[brace].spelling.split(/[{=]/)[0] }]), generics) : undefined
      const propertyVersion = availableFrom(usr, propertyType ? [propertyType] : [])
      const accessor = /\{\s*get\s+([^}]*)\}/.exec(decl)?.[1] ?? ''
      const getAsync = /\basync\b/.test(accessor)
      const getThrows = /\bthrows\b/.test(accessor)
      if (!exclude.has(`${usr}:get`)) entries.push({
        id: 0, key: `${usr}:get`, usr, owner, name: base, kind: 'get', isAsync: getAsync, main, params: [], returns: propertyType, specialization, receiver,
        swift: guarded(propertyVersion, `${receiverFor(false)}return c.out(${getThrows ? 'try ' : ''}${main || getAsync ? 'await ' : ''}${target})`),
      })
      else skipped.push({ usr, path, reason: exclude.get(`${usr}:get`)! })
      const readOnly = /\blet\b/.test(decl) || /\{\s*get\b(?![^}]*\bset\b)/.test(decl) || /\bprivate\(set\)/.test(decl)
      if (!readOnly && exclude.has(`${usr}:set`)) skipped.push({ usr, path, reason: exclude.get(`${usr}:set`)! })
      else if (!readOnly) {
        const writeBack = valueOwner && !isStatic && kind !== 'swift.var' ? '; c.setReceiver(o)' : ''
        entries.push({
          id: 0, key: `${usr}:set`, usr, owner, name: base, kind: 'set', isAsync: false, main, params: propertyType ? [{ label: '_', name: 'value', type: propertyType, optional: propertyType.k === 'optional', hasDefault: false }] : [], specialization, receiver,
          swift: guarded(propertyVersion, `${receiverFor(!!valueOwner)}${target} = try c.arg(0)${writeBack}; return c.void`),
        })
      }
      continue
    }

    const parameters = symbol.functionSignature?.parameters ?? []
    const hoisted: string[] = []
    const args: string[] = []
    const outs: string[] = []
    const params: Entry['params'] = []
    let reason = ''
    parameters.forEach((parameter, i) => {
      const { fragments, defaultValue } = parameterTypeFragments(parameter.declarationFragments)
      const type = bridge.substitute(parameterType(parameter.declarationFragments), generics)
      const argLabel = labels[i] ?? '_'
      const prefix = argLabel === '_' ? '' : `${label(argLabel)}: `
      const typeText = replaceTypes(swiftTypeText(fragments))
      if (/\bsome\b/.test(typeText)) reason = 'opaque parameter'
      for (const ref of typeUsrs(type)) {
        const module = bridge.index.get(ref)?.module
        if (module) imports.add(module)
      }
      const name = parameter.internalName ?? parameter.name
      const written = outPointee(type)
      if (written) {
        const pointee = /^(?:Autoreleasing)?Unsafe\w*Pointer<(.*)>\??$/s.exec(typeText)?.[1]
        hoisted.push(`var out${i}: ${pointee} = ${written.k === 'optional' ? 'nil' : 'false'}`)
        outs.push(`${JSON.stringify(name)}: out${i}`)
        params.push({ label: argLabel, name, type, optional: true, hasDefault: true, out: true })
        args.push(`${prefix}&out${i}`)
        return
      }
      params.push({ label: argLabel, name, type, optional: type.k === 'optional', hasDefault: defaultValue !== undefined })
      const fn = functionOf(type)
      if (fn) {
        if (fn.fn.async) reason = 'async callback'
        const names = fn.fn.params.map((_, n) => `p${n}`)
        const fetch = fn.optional ? `c.has(${i}) ? try c.callback(${i}) : nil` : `try c.callback(${i})`
        hoisted.push(`let f${i} = ${fetch}`)
        const invoke = `f${i}${fn.optional ? '?' : ''}(${names.join(', ')})`
        const closure = `{ ${names.length ? `${names.join(', ')} in ` : ''}${invoke} }`
        const bare = typeText.replace(/^\((.*)\)\?$/s, '$1')
        args.push(`${prefix}${fn.optional ? `(f${i} == nil ? nil : (${closure} as ${bare}))` : `(${closure} as ${typeText})`}`)
        return
      }
      if (type.k === 'variadic') {
        reason = 'variadic'
        return
      }
      const value = defaultValue !== undefined && defaultValue !== '' && !defaultValue.startsWith('#')
        ? `try c.arg(${i}, or: ${replaceTypes(defaultValue)})`
        : `try c.arg(${i})`
      args.push(`${prefix}(${value} as ${typeText})`)
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
      call = `${owner}(${args.join(', ')})`
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
    const returnType = !returnsVoid && kind !== 'swift.init' ? bridge.substitute(parseType(symbol.functionSignature?.returns ?? []), generics) : undefined
    if (specialization && returnType) call = `(${call} as ${replaceTypes(swiftTypeText(symbol.functionSignature?.returns ?? []))})`
    const mutating = /\bmutating\b/.test(decl)
    const needsReceiver = (entryKind === 'method' || entryKind === 'subscript') && !isStatic
    const lines = [
      ...(needsReceiver ? [`${mutating ? 'var' : 'let'} o: ${receiverType} = try c.receiver()`] : []),
      ...hoisted,
    ]
    const effects = `${throws ? 'try ' : ''}${isAsync || main ? 'await ' : ''}`
    if (outs.length) {
      lines.push(returnsVoid ? `${effects}${call}` : `let r = ${effects}${call}`)
      if (mutating) lines.push('c.setReceiver(o)')
      lines.push(`return c.outs(${returnsVoid ? 'nil' : 'r'}, [${outs.join(', ')}])`)
    } else if (returnsVoid) {
      lines.push(`${effects}${call}`)
      if (mutating) lines.push('c.setReceiver(o)')
      lines.push('return c.void')
    } else if (mutating) {
      lines.push(`let r = ${effects}${call}`, 'c.setReceiver(o)', 'return c.out(r)')
    } else {
      lines.push(`return c.out(${effects}${call})`)
    }
    entries.push({
      id: 0, key: usr, usr, owner, name: base, kind: entryKind, isAsync, main, params, specialization, receiver,
      returns: returnType,
      swift: guarded(availableFrom(usr, [...params.map((p) => p.type), ...(returnType ? [returnType] : []), ...Object.values(specialization ?? {})]), lines.join('; ')),
    })
  }

  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  entries.forEach((entry, id) => (entry.id = id))
  return { module: graph.module, entries, skipped, swift: renderSwift(graph.module, [...imports].sort(), entries, conformances) }
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

function renderSwift(module: string, imports: string[], entries: Entry[], conformances: string[]) {
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
  const dispatch = (list: Entry[], isAsync: boolean) => {
    const groups: string[] = []
    for (let at = 0; at < list.length; at += CHUNK) {
      const slice = list.slice(at, at + CHUNK)
      groups.push(`    if [${slice.map((e) => e.id).join(',')}].contains(id) { return try ${isAsync ? 'await ' : ''}${isAsync ? 'async' : 'sync'}${at / CHUNK}(id, c) }`)
    }
    return groups
  }
  return `// generated by packages/one/codegen/sdk/emit.ts; do not edit
import Foundation
import One
${imports.filter((m) => m !== 'Foundation').map((m) => `import ${m}`).join('\n')}

${conformances.join('\n\n')}

@objc(OneSDKTable_${module}) final class OneSDKTable_${module}: NSObject, OneSDKTable {
  func sync(_ id: Int, _ call: OneSDKCall) throws -> Any { try ${name}.sync(id, call) }
  func async(_ id: Int, _ call: OneSDKCall) async throws -> Any { try await ${name}.async(id, call) }
}

enum ${name} {
  static func sync(_ id: Int, _ c: OneSDKCall) throws -> Any {
${dispatch(sync, false).join('\n')}
    throw OneSDKError.unknownSymbol("${module}.\\(id)")
  }

  static func async(_ id: Int, _ c: OneSDKCall) async throws -> Any {
${dispatch(async, true).join('\n')}
    throw OneSDKError.unknownSymbol("${module}.\\(id)")
  }

${[...chunks(sync, false), ...chunks(async, true)].join('\n\n')}
}
`
}
