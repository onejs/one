import type { DerivedFactory, DerivedFactoryParameter, DerivedModifier, DerivedValue } from './deriveSDK'
import { sdkGuard } from './sdkGuard'

// SDK values JavaScript spells as a case name or as a record: { kind, ...parameters }
// names a case or a static factory, and any chained instance method rides along by name,
// so { kind: 'spring', duration: 0.4, bounce: 0.2, delay: 0.1 } is
// Animation.spring(duration: 0.4, bounce: 0.2).delay(0.1). JavaScript and Swift pick the
// overload the same way: the one taking every given parameter with the fewest parameters.

export const valueKey = (type: string) => type.replace(/\?$/, '').split('.').slice(1).join('')

const baseType = (type: string) => type.replace(/\?$/, '')

// every value a modifier or record argument reaches, keyed by type. one type can be
// derived at several nesting depths; the richest derivation is a superset of the others.
export function collectValues(derived: readonly DerivedModifier[]) {
  const values = new Map<string, DerivedValue>()
  const size = (value: DerivedValue) => value.factories.length + value.chain.length
  const visit = (value: DerivedValue) => {
    const key = valueKey(value.type)
    const known = values.get(key)
    if (known && size(known) >= size(value)) return
    values.set(key, value)
    for (const factory of [...value.factories, ...value.chain]) visitFactory(factory)
  }
  const visitFactory = (factory: DerivedFactory) => {
    for (const parameter of factory.parameters) if (parameter.value) visit(parameter.value)
  }
  for (const modifier of derived) {
    if (modifier.value) visit(modifier.value)
    for (const factory of modifier.factories ?? []) visitFactory(factory)
    for (const argument of modifier.arguments ?? [])
      if (argument.kind === 'enum' && argument.value) visit(argument.value)
  }
  return [...values.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

// a value with no factories or chained methods is still spelled by case name alone.
export const hasRecords = (value: DerivedValue | undefined) =>
  Boolean(value && (value.factories.length || value.chain.length))

const swiftString = (value: string) => JSON.stringify(value)

// chained methods with one required parameter take it directly, with none take true,
// and otherwise take an object of their parameters.
const chainForm = (method: DerivedFactory) =>
  method.parameters.length === 0
    ? 'flag'
    : method.parameters.length === 1 && method.parameters[0].defaultValue === undefined
      ? 'scalar'
      : 'object'

const parameterSwift = (parameter: DerivedFactoryParameter, record: string, key: string, context: string) => {
  const nested = `${context} + ${swiftString(`.${key}`)}`
  const read = parameter.kind === 'number'
    ? parameter.type === 'Swift.Int'
      ? `${record}.integer(${swiftString(key)})`
      : parameter.type === 'CoreFoundation.CGFloat' || parameter.type === 'Swift.Float'
        ? `${record}.number(${swiftString(key)}).map { ${parameter.type}($0) }`
        : `${record}.number(${swiftString(key)})`
    : parameter.kind === 'boolean'
      ? `${record}.boolean(${swiftString(key)})`
      : `${record}.fields[${swiftString(key)}].map { oneNativeSDKValue${valueKey(parameter.value!.type)}($0, ${nested}) }`
  if (parameter.defaultValue === undefined) return `${read}!`
  return `(${read} ?? ${parameter.kind === 'enum' ? `${baseType(parameter.type)}${parameter.defaultValue}` : parameter.defaultValue})`
}

export const callArguments = (factory: DerivedFactory, record: string, context: string) =>
  factory.parameters.map((parameter) => {
    const value = parameterSwift(parameter, record, parameter.field, context)
    return parameter.label === '_' ? value : `${parameter.label}: ${value}`
  }).join(', ')

const swiftSet = (items: readonly string[]) => `[${items.map(swiftString).join(', ')}]`

const overloadSwift = (parameters: readonly DerivedFactoryParameter[]) =>
  `(labels: ${swiftSet(parameters.map((parameter) => parameter.field))}, required: ${swiftSet(parameters.filter((parameter) => parameter.defaultValue === undefined).map((parameter) => parameter.field))})`

// kinds a record may name, each with its overloads: the bare case first, then factories.
const kindsOf = (cases: readonly { name: string; ios: number }[], factories: readonly DerivedFactory[]) => {
  const names = [...new Set([...cases.map((item) => item.name), ...factories.map((factory) => factory.name)])]
  return names.map((name) => ({
    name,
    overloads: [
      ...cases.filter((item) => item.name === name).map((item) => ({ ios: item.ios, parameters: [] as readonly DerivedFactoryParameter[], factory: undefined as DerivedFactory | undefined })),
      ...factories.filter((factory) => factory.name === name).map((factory) => ({ ios: factory.ios, parameters: factory.parameters, factory })),
    ],
  }))
}

// a record switch shared by the value decoders and the style modifiers. `call` writes the
// Swift for one overload: a factory, or the bare case when `factory` is undefined.
export function recordSwitchSwift(options: {
  cases: readonly { name: string; ios: number }[]
  factories: readonly DerivedFactory[]
  chain: readonly string[]
  record: string
  context: string
  indent: string
  failure: (message: string) => string
  call: (name: string, ios: number, factory: DerivedFactory | undefined) => string
}) {
  const { indent, record, failure } = options
  const kinds = kindsOf(options.cases, options.factories)
  return `${indent}switch ${record}.kind {
${kinds.map((kind) => `${indent}case ${swiftString(kind.name)}:
${indent}  switch ${record}.overload([${kind.overloads.map((overload) => overloadSwift(overload.parameters)).join(', ')}], chain: ${swiftSet(options.chain)}) {
${kind.overloads.map((overload, index) => `${indent}  case ${index}:${options.call(kind.name, overload.ios, overload.factory)}`).join('\n')}
${indent}  default: ${failure(`"invalid \\(${options.context}): \\(${record}.kind)"`)}
${indent}  }`).join('\n')}
${indent}default: ${failure(`"invalid \\(${options.context}): \\(${record}.kind)"`)}
${indent}}`
}

const available = (ios: number, code: string, failure: string) =>
  ios > 17
    ? `\n${sdkGuard(ios, `if #available(iOS ${ios}, *) { ${code} }`, '')}\n${failure}`
    : ` ${code}`

export function emitValueDecoders(values: readonly [string, DerivedValue][]) {
  const decoders = values.map(([key, value]) => {
    const type = baseType(value.type)
    const chain = value.chain.map((method) => method.name)
    const body = recordSwitchSwift({
      cases: value.cases,
      factories: value.factories,
      chain,
      record: 'record',
      context: 'context',
      indent: '    ',
      failure: (message) => `preconditionFailure(${message})`,
      call: (name, ios, factory) => available(ios,
        `return ${type}.${name}${factory ? `(${callArguments(factory, 'record', 'context')})` : ''}`,
        `      preconditionFailure("unavailable \\(context): ${name}")`),
    })
    const chained = value.chain.map((method) => {
      const form = chainForm(method)
      const unavailable = `preconditionFailure("unavailable \\(context).${method.name}")`
      const apply = (code: string) => method.ios > 17
        ? `\n${sdkGuard(method.ios, `if #available(iOS ${method.ios}, *) { ${code} } else { ${unavailable} }`, unavailable)}\n`
        : code
      if (form === 'flag')
        return `  if record.boolean(${swiftString(method.name)}) == true { ${apply(`result = result.${method.name}()`)} }`
      if (form === 'scalar') {
        const parameter = method.parameters[0]
        const value = parameterSwift({ ...parameter, defaultValue: undefined }, 'record', method.name, 'context')
        return `  if record.fields[${swiftString(method.name)}] != nil { ${apply(`result = result.${method.name}(${parameter.label === '_' ? '' : `${parameter.label}: `}${value})`)} }`
      }
      return `  if let item = record.chained(${swiftString(method.name)}) {
    _ = item.overload([${overloadSwift(method.parameters)}], chain: [])
    ${apply(`result = result.${method.name}(${callArguments(method, 'item', 'context')})`)}
  }`
    })
    // a type is no newer than its oldest member, which bounds types declared outside the
    // inventory, such as Foundation.AttributedString.LineHeight.
    const version = Math.max(value.ios, Math.min(...[...value.cases, ...value.factories, ...value.chain].map((member) => member.ios)))
    const decoder = `${version > 17 ? `@available(iOS ${version}, *)\n` : ''}func oneNativeSDKValue${key}(_ value: Any, _ context: String) -> ${type} {
  let record = OneNativeSDKRecord(value, context)
  ${chained.length ? `var result: ${type} = { () -> ${type} in` : `return { () -> ${type} in`}
${body}
  }()
${chained.length ? `${chained.join('\n')}\n  return result\n` : ''}}`
    return version > 17 ? sdkGuard(version, decoder, '') : decoder
  })
  // an overlay module such as _MapKit_SwiftUI loads with its framework beside SwiftUI.
  const imports = [...new Set(values.map(([, value]) => value.type.split('.')[0])
    .map((module) => /^_(\w+)_SwiftUI$/.exec(module)?.[1] ?? module)
    .filter((module) => module !== 'SwiftUI' && module !== 'SwiftUICore'))].sort()
  return `import SwiftUI
${imports.map((module) => `import ${module}\n`).join('')}
// an SDK value from JavaScript: a bare case name, or a JSON record naming a case or
// factory in kind with parameters and chained methods by label.
struct OneNativeSDKRecord {
  let kind: String
  let fields: [String: Any]
  let context: String

  init(_ value: Any, _ context: String) {
    self.context = context
    var object = value
    if let text = value as? String {
      guard text.hasPrefix("{") else {
        kind = text
        fields = [:]
        return
      }
      guard let data = text.data(using: .utf8),
        let parsed = try? JSONSerialization.jsonObject(with: data) else {
        preconditionFailure("invalid \\(context): \\(text)")
      }
      object = parsed
    }
    guard var record = object as? [String: Any], let kind = record.removeValue(forKey: "kind") as? String else {
      preconditionFailure("invalid \\(context)")
    }
    self.kind = kind
    fields = record
  }

  private init(fields: [String: Any], context: String) {
    kind = ""
    self.fields = fields
    self.context = context
  }

  // the overload taking every given parameter with the fewest parameters. chained
  // methods are not parameters.
  func overload(_ overloads: [(labels: Set<String>, required: Set<String>)], chain: Set<String>) -> Int {
    let given = Set(fields.keys).subtracting(chain)
    let matches = overloads.indices.filter {
      given.isSubset(of: overloads[$0].labels) && overloads[$0].required.isSubset(of: given)
    }
    let fewest = matches.map { overloads[$0].labels.count }.min()
    let best = matches.filter { overloads[$0].labels.count == fewest }
    guard best.count == 1 else {
      preconditionFailure("\\(best.isEmpty ? "no" : "ambiguous") \\(context) \\(kind) taking \\(given.sorted())")
    }
    return best[0]
  }

  func number(_ key: String) -> Double? {
    guard let raw = fields[key] else { return nil }
    guard let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
      number.doubleValue.isFinite else { preconditionFailure("invalid \\(context).\\(key)") }
    return number.doubleValue
  }

  func integer(_ key: String) -> Int? {
    guard let number = number(key) else { return nil }
    guard let integer = Int(exactly: number) else { preconditionFailure("invalid \\(context).\\(key)") }
    return integer
  }

  func boolean(_ key: String) -> Bool? {
    guard let raw = fields[key] else { return nil }
    guard let number = raw as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else {
      preconditionFailure("invalid \\(context).\\(key)")
    }
    return number.boolValue
  }

  func chained(_ key: String) -> OneNativeSDKRecord? {
    guard let raw = fields[key] else { return nil }
    guard let object = raw as? [String: Any] else { preconditionFailure("invalid \\(context).\\(key)") }
    return OneNativeSDKRecord(fields: object, context: "\\(context).\\(key)")
  }
}

${decoders.join('\n\n')}
`
}

const parameterTS = (parameter: DerivedFactoryParameter) =>
  parameter.kind === 'enum' ? `SDK${valueKey(parameter.value!.type)}Value` : parameter.kind

const fieldsTS = (parameters: readonly DerivedFactoryParameter[]) =>
  parameters.map((parameter) => `${parameter.field}${parameter.defaultValue === undefined ? '' : '?'}: ${parameterTS(parameter)}`)

// the record union for a set of cases and factories, with chained methods on every member.
export function recordTS(cases: readonly { name: string }[], factories: readonly DerivedFactory[], chain: readonly DerivedFactory[]) {
  const chained = chain.map((method) => {
    const form = chainForm(method)
    return `${method.name}?: ${form === 'flag' ? 'true' : form === 'scalar' ? parameterTS(method.parameters[0]) : `Readonly<{ ${fieldsTS(method.parameters).join('; ')} }>`}`
  })
  return [
    ...(cases.length ? [[`kind: ${cases.map((item) => JSON.stringify(item.name)).join(' | ')}`]] : []),
    ...factories.map((factory) => [`kind: ${JSON.stringify(factory.name)}`, ...fieldsTS(factory.parameters)]),
  ].map((fields) => `Readonly<{ ${[...fields, ...chained].join('; ')} }>`).join(' | ')
}

export function valueTypesTS(values: readonly [string, DerivedValue][]) {
  return values.map(([key, value]) => {
    const names = value.cases.map((item) => JSON.stringify(item.name)).join(' | ')
    if (!hasRecords(value)) return `export type SDK${key}Value = ${names || 'never'}`
    return `export type SDK${key}Record = ${recordTS(value.cases, value.factories, value.chain)}
export type SDK${key}Value = ${names ? `${names} | ` : ''}SDK${key}Record`
  }).join('\n')
}

type ShapeParameter = { field: string; kind: string; optional?: true; integer?: true; value?: string }
const shapeParameters = (parameters: readonly DerivedFactoryParameter[]): ShapeParameter[] =>
  parameters.map((parameter) => ({
    field: parameter.field,
    kind: parameter.kind,
    ...(parameter.defaultValue !== undefined ? { optional: true as const } : {}),
    ...(parameter.type === 'Swift.Int' ? { integer: true as const } : {}),
    ...(parameter.value ? { value: valueKey(parameter.value.type) } : {}),
  }))

// the shapes the JavaScript validator reads: values by type key, and style modifiers with
// factories by `style:<modifier>`.
export function valueShapesTS(values: readonly [string, DerivedValue][], derived: readonly DerivedModifier[]) {
  const shape = (cases: readonly { name: string }[], factories: readonly DerivedFactory[], chain: readonly DerivedFactory[]) => ({
    cases: cases.map((item) => item.name),
    factories: factories.map((factory) => ({ name: factory.name, parameters: shapeParameters(factory.parameters) })),
    chain: chain.map((method) => ({ name: method.name, form: chainForm(method), parameters: shapeParameters(method.parameters) })),
  })
  return JSON.stringify(Object.fromEntries([
    ...values.map(([key, value]) => [key, shape(value.cases, value.factories, value.chain)]),
    ...derived.filter((modifier) => modifier.kind === 'style' && modifier.factories?.length)
      .map((modifier) => [`style:${modifier.name}`, shape(modifier.cases!, modifier.factories!, [])]),
  ]))
}

// the JavaScript half of OneNativeSDKRecord: validates a value against its shape and
// returns the text native decodes.
export const valueValidatorTS = (shapes: string) => `type SDKValueParameter = { field: string; kind: string; optional?: true; integer?: true; value?: string }
type SDKValueShape = { cases: readonly string[]; factories: readonly { name: string; parameters: readonly SDKValueParameter[] }[]; chain: readonly { name: string; form: string; parameters: readonly SDKValueParameter[] }[] }
const sdkValueShapes: Record<string, SDKValueShape> = ${shapes}

function checkSDKParameter(value: unknown, parameter: SDKValueParameter, context: string) {
  if (parameter.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (parameter.integer && !Number.isSafeInteger(value)))
      throw new Error(context + (parameter.integer ? ' must be an integer' : ' must be finite'))
  } else if (parameter.kind === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(context + ' must be a boolean')
  } else checkSDKValue(value, parameter.value!, context)
}

function checkSDKParameters(record: Record<string, unknown>, given: readonly string[], parameters: readonly SDKValueParameter[], context: string) {
  for (const parameter of parameters)
    if (given.includes(parameter.field)) checkSDKParameter(record[parameter.field], parameter, context + '.' + parameter.field)
}

const fitsSDKOverload = (given: readonly string[], parameters: readonly SDKValueParameter[]) =>
  given.every((key) => parameters.some((parameter) => parameter.field === key)) &&
  parameters.every((parameter) => parameter.optional || given.includes(parameter.field))

function checkSDKValue(value: unknown, key: string, context: string) {
  const shape = sdkValueShapes[key]
  if (typeof value === 'string') {
    if (!shape.cases.includes(value)) throw new Error(context + ' must be one of ' + shape.cases.join(', ') + ' or a record')
    return
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as { kind?: unknown }).kind !== 'string')
    throw new Error(context + ' must be a case name or a record with a kind')
  const record = value as Record<string, unknown>
  const kind = record.kind as string
  const chained = new Set(shape.chain.map((method) => method.name))
  const given = Object.keys(record).filter((field) => field !== 'kind' && !chained.has(field))
  const overloads = [
    ...(shape.cases.includes(kind) ? [[]] : []),
    ...shape.factories.filter((factory) => factory.name === kind).map((factory) => factory.parameters),
  ].filter((parameters) => fitsSDKOverload(given, parameters))
  const fewest = Math.min(...overloads.map((parameters) => parameters.length))
  const best = overloads.filter((parameters) => parameters.length === fewest)
  if (best.length !== 1)
    throw new Error(context + ' has ' + (best.length ? 'more than one ' : 'no ') + kind + ' taking ' + (given.join(', ') || 'no parameters'))
  checkSDKParameters(record, given, best[0], context)
  for (const method of shape.chain) {
    if (!Object.hasOwn(record, method.name)) continue
    const item = record[method.name]
    const name = context + '.' + method.name
    if (method.form === 'flag') {
      if (item !== true) throw new Error(name + ' must be true')
    } else if (method.form === 'scalar') checkSDKParameter(item, method.parameters[0], name)
    else {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(name + ' must be a record')
      const fields = Object.keys(item)
      if (!fitsSDKOverload(fields, method.parameters)) throw new Error(name + ' takes ' + method.parameters.map((parameter) => parameter.field).join(', '))
      checkSDKParameters(item as Record<string, unknown>, fields, method.parameters, name)
    }
  }
}

// returns the text native decodes: the case name, or the record as JSON. a record is
// validated as the parsed JSON it serializes to, so toJSON, getters and undefined fields
// cannot send native anything other than what was checked.
export function sdkValueText(value: unknown, key: string, context: string): string {
  if (typeof value === 'string') {
    checkSDKValue(value, key, context)
    return value
  }
  const text = JSON.stringify(value)
  if (typeof text !== 'string') throw new Error(context + ' must be a case name or a record with a kind')
  checkSDKValue(JSON.parse(text), key, context)
  return text
}`
