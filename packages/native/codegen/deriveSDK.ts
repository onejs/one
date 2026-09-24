import { ios, present, type Declaration } from './inventory'
import type { Control } from './controlTypes'

const emptyEventOrBindingType = /^(?:@escaping )?\(\) -> Swift\.Void\??$|^\(\(\) -> (?:Swift\.Void|\(\))\)\?$|^SwiftUICore\.Binding<(?:Swift\.(?:Bool|String)|Foundation\.URL\?)>$/
const scalarCallbackType = /^(?:@escaping )?\((?:_ [A-Za-z]\w*: )?(Swift\.(?:Bool|String|Int|Float|Double)|CoreFoundation\.CGFloat|Foundation\.URL)\) -> (?:Swift\.Void|\(\))$/
const eventOrBindingType = (type: string) => emptyEventOrBindingType.test(type) || scalarCallbackType.test(type)
const focusBindingType = /^SwiftUI\.(?:Accessibility)?FocusState<Swift\.Bool>\.Binding$/

export type DerivedArgument = {
  field: string
  label: string
  type: string
  sdkType?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'enum' | 'stringArray' | 'stringSet' | 'numericStruct' | 'numericTuple' | 'bindingBoolean' | 'bindingOptionalURL' | 'resultURL' | 'resultURLArray' | 'eventStruct' | 'classUpdate' | 'structUpdate'
  optional: boolean
  cases?: readonly { name: string; ios: number }[]
  fields?: readonly { name: string; label: string; type: string; ios?: number }[]
  wrappedType?: string
  scalarConstructor?: { label: string; type: string; failable?: boolean }
  swiftExpression?: string
  closureInput?: string
  eventValue?: EventValueSchema
  unique?: true
}

export type EventValueSchema =
  | { kind: 'number' | 'string' | 'boolean' | 'point' | 'size' | 'description' }
  | { kind: 'enum'; cases: readonly string[]; open?: true }
  | { kind: 'optional'; value: EventValueSchema }
  | { kind: 'array'; value: EventValueSchema }
  | { kind: 'object'; fields: readonly { name: string; value: EventValueSchema }[] }
  | { kind: 'result'; value: EventValueSchema }
  | { kind: 'verification' }
  | { kind: 'associatedEnum'; cases: readonly { name: string; values: readonly EventValueSchema[] }[]; open?: true }

export type DerivedModifier = {
  name: string
  sdkName?: string
  module?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'optionalBoolean' | 'optionalNumber' | 'optionalString' | 'optionalURL' | 'optionalEnum' | 'record' | 'style' | 'visualEffect' | 'optionSet' | 'caseSet' | 'selectionID' | 'selectionIndex' | 'dragContainer' | 'dragSelection' | 'dragItemID' | 'asyncObjectRequest' | 'sessionRequest' | 'gesture' | 'defaultFocusBoolean' | 'event' | 'eventAsync' | 'eventAsyncStruct' | 'eventAsyncString' | 'eventDrop' | 'eventNotification' | 'eventBoolean' | 'eventNumber' | 'eventString' | 'eventEnum' | 'eventEnumPair' | 'eventAssociatedEnum' | 'eventStruct' | 'eventValueString' | 'eventReturnArray' | 'eventReturnEnum' | 'bindingBoolean' | 'bindingString' | 'bindingOptionalString' | 'bindingFocusBoolean' | 'bindingCodable' | 'bindingPoint'
  ios: number
  type: string
  rawString?: true
  scalarConstructor?: { label: string; type: string; failable?: boolean }
  swiftExpression?: string
  cases?: readonly { name: string; ios: number }[]
  associatedCases?: readonly { name: string; values: readonly EventValueSchema[] }[]
  eventValue?: EventValueSchema
  eventInputType?: string
  resultType?: string
  selectionMember?: string
  selectionInputIndex?: number
  requestType?: string
  requestProperty?: string
  sessionRequest?: { method: string; inputField: string; outputFields: readonly string[];
    actionLabel: string; defaults: readonly { label: string; value: string }[] }
  uiRecognizer?: true
  resultConstructor?: { type: string; label: string }
  eventPair?: true
  eventInputs?: readonly string[]
  visualPhase?: true
  gestureOptions?: readonly { name: string; type: string; ios: number; eventValue?: EventValueSchema }[]
  transformMember?: string
  environmentKey?: string
  environmentTransform?: 'toggle' | 'add'
  preferenceKey?: string
  preferenceOperation?: 'set' | 'transform' | 'observe'
  zeroArgument?: true
  framework?: string
  label?: string
  callbackLabel?: string
  predicateLabel?: string
  bindingType?: string
  bindingDefault?: true
  predicateInput?: string
  aliasSuffix?: string
  callArguments?: readonly { label: string; defaultValue?: string; bridge?: true }[]
  namespaceParameter?: { index: number; label: string }
  sharedParameter?: { index: number; label: string; type: string; factoryName?: string }
  factoryParameter?: { index: number; label: string; type: string; returnType: string; argumentOffset: number }
  constructorParameter?: { type: string; label: string }
  fixedParameter?: { index: number; label: string; type: string; expression: string }
  arguments?: readonly DerivedArgument[]
}

const bridgeValueOf = (inventory: readonly Declaration[], ceiling: number) => {
  const affineFields = ['a', 'b', 'c', 'd', 'tx', 'ty'].map((name) =>
    ({ name, label: name, type: 'CoreFoundation.CGFloat' }))
  return (type: string, preferNumeric = false): Omit<DerivedArgument, 'field' | 'label'> | undefined => {
    const optional = type.endsWith('?')
    const baseType = type.replace(/\?$/, '')
    if (baseType === 'CoreFoundation.CGAffineTransform')
      return { kind: 'numericStruct', type, optional, fields: affineFields }
    if (baseType === 'CoreFoundation.CGSize')
      return { kind: 'numericStruct', type, optional, fields: ['width', 'height'].map((name) =>
        ({ name, label: name, type: 'CoreFoundation.CGFloat' })) }
    const kind = baseType === 'Swift.Bool'
      ? 'boolean'
      : ['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat'].includes(baseType)
        ? 'number'
        : baseType === 'Swift.String' || baseType === 'SwiftUICore.Text'
          ? 'string'
          : baseType === 'Foundation.URL'
            ? 'url'
            : undefined
    if (kind) return { kind, type, optional }
    if (baseType === 'SwiftUICore.Image' && inventory.some((declaration) =>
      declaration.module === 'SwiftUICore' && declaration.owner === baseType &&
      declaration.kind === 'init' && declaration.parameters.length === 1 &&
      declaration.parameters[0].label === 'systemName' &&
      declaration.parameters[0].type === 'Swift.String' && present(declaration) && ios(declaration) <= ceiling))
      return { kind: 'string', type, optional }
    if (baseType === '[Swift.String]' || baseType === '[SwiftUICore.Text]')
      return { kind: 'stringArray', type, optional }
    if (baseType === '[UniformTypeIdentifiers.UTType]')
      return { kind: 'stringArray', type, optional,
        swiftExpression: '({ () -> [UniformTypeIdentifiers.UTType] in\n        let identifiers = $value\n        if identifiers.isEmpty { return [.item] }\n        return identifiers.map { identifier in\n          guard let type = UniformTypeIdentifiers.UTType(identifier) else { preconditionFailure("invalid content type: \\(identifier)") }\n          return type\n        }\n      })()' }
    if (baseType === 'Swift.Set<Swift.String>')
      return { kind: 'stringSet', type, optional }
    const numericType = (value: string) =>
      ['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat'].includes(value)
    if (baseType.startsWith('(') && baseType.endsWith(')')) {
      const fields = baseType.slice(1, -1).split(', ').map((part) => {
        const match = /^([A-Za-z]\w*): (.+)$/.exec(part)
        return match && numericType(match[2])
          ? { name: match[1], label: match[1], type: match[2] } : undefined
      })
      if (fields.length && fields.every(Boolean))
        return { kind: 'numericTuple', type, optional, fields: fields as NonNullable<DerivedArgument['fields']> }
    }
    if (!/^[A-Za-z_]\w*\.[A-Za-z][\w.]*$/.test(baseType)) return
    const [module, ...owner] = baseType.split('.')
    const ownerName = owner.join('.')
    const alias = inventory.find((d) => d.module === module && d.kind === 'typealias' &&
      d.owner === owner.slice(0, -1).join('.') && d.name === owner.at(-1) &&
      present(d) && ios(d) <= ceiling)
    if (alias?.type === 'Swift.UInt64')
      return { kind: 'string', type, optional,
        swiftExpression: 'UInt64($value) ?? { () -> UInt64 in preconditionFailure("invalid UInt64") }()' }
    if (alias?.type === 'Swift.String') return { kind: 'string', type, optional }
    let numericStruct: Omit<DerivedArgument, 'field' | 'label'> | undefined
    const publicStruct = inventory.find((d) => d.module === module && d.kind === 'struct' &&
      d.owner === owner.slice(0, -1).join('.') && d.name === owner.at(-1) &&
      !d.generic && present(d) && ios(d) <= ceiling)
    if (publicStruct) {
      const stored = inventory.filter((d) => d.module === module &&
        (d.owner === ownerName || d.owner === baseType) && d.kind === 'var' &&
        d.stored && present(d) && ios(d) <= ceiling)
      const constructors = inventory.filter((d) => d.module === module &&
        (d.owner === ownerName || d.owner === baseType) && d.kind === 'init' &&
        !d.requirements?.length && present(d) && ios(d) <= ceiling &&
        d.parameters.length === stored.length && d.parameters.length > 0 &&
        d.parameters.every((parameter) => numericType(parameter.type) &&
          stored.some((field) => field.name === parameter.label && field.type === parameter.type)))
      if (constructors.length === 1 && stored.every((field) => numericType(field.type ?? '')))
        numericStruct = { kind: 'numericStruct', type, optional, fields: constructors[0].parameters.map((parameter) =>
          ({ name: parameter.label, label: parameter.label, type: parameter.type })) }
    }
    if (publicStruct && !numericStruct) {
      const dataConstructor = inventory.filter((d) => d.module === module &&
        (d.owner === ownerName || d.owner === baseType) && d.kind === 'init' &&
        d.parameters.length === 1 && d.parameters[0].label === 'from' &&
        d.parameters[0].type === 'Foundation.Data' && !d.requirements?.length &&
        present(d) && ios(d) <= ceiling)
      const dataRepresentation = inventory.some((d) => d.module === module &&
        (d.owner === ownerName || d.owner === baseType) && d.kind === 'var' &&
        d.name === 'dataRepresentation' && d.type === 'Foundation.Data' &&
        present(d) && ios(d) <= ceiling)
      if (dataConstructor.length === 1 && dataRepresentation)
        return { kind: 'string', type, optional,
          swiftExpression: `({ () -> ${baseType} in guard let data = Foundation.Data(base64Encoded: $value), let result = try? ${baseType}(from: data) else { preconditionFailure("invalid ${baseType} data") }; return result })()` }
      const affineInitializers = inventory.filter((d) => d.module === module &&
        (d.owner === ownerName || d.owner === baseType) && d.kind === 'init' &&
        d.parameters.length === 1 && d.parameters[0].label === '_' &&
        d.parameters[0].type === 'CoreFoundation.CGAffineTransform' &&
        !d.requirements?.length && present(d) && ios(d) <= ceiling)
      if (affineInitializers.length === 1)
        numericStruct = { kind: 'numericStruct', type, optional, fields: affineFields,
          wrappedType: 'CoreFoundation.CGAffineTransform' }
    }
    const cases = inventory
      .filter((d) =>
        ((d.module === module && d.owner === owner.join('.')) || d.owner === baseType) &&
        d.kind === 'static' && d.parameters.length === 0 &&
        (d.type?.replace('?', '') === owner.join('.') || d.type?.replace('?', '') === baseType ||
          d.type?.replace('?', '') === owner.at(-1) || d.type?.replace('?', '').endsWith(`.${owner.at(-1)}`)) &&
        /^[A-Za-z]/.test(d.name) && present(d) && ios(d) <= ceiling
      )
      .map((d) => ({ name: d.name, ios: ios(d) }))
    if (preferNumeric && numericStruct && cases.length < 2) return numericStruct
    if (!cases.length || new Set(cases.map((item) => item.name)).size !== cases.length) {
      if (numericStruct) return numericStruct
      if (publicStruct && !publicStruct.inheritedTypes?.includes('Swift.RawRepresentable')) {
        const constructors = inventory.filter((d) => d.module === module &&
          (d.owner === ownerName || d.owner === baseType) && d.kind === 'init' &&
          d.parameters.length === 1 && !d.requirements?.length &&
          d.parameters[0].label !== 'rawValue' &&
          ['Swift.Bool', 'Swift.String', 'Swift.Double', 'CoreFoundation.CGFloat'].includes(d.parameters[0].type) &&
          present(d) && ios(d) <= ceiling)
        if (constructors.length === 1) {
          const parameter = constructors[0].parameters[0]
          return { kind: parameter.type === 'Swift.Bool' ? 'boolean' : parameter.type === 'Swift.String' ? 'string' : 'number',
            type, optional, scalarConstructor: { label: parameter.label, type: parameter.type,
              ...(constructors[0].failable ? { failable: true } : {}) } }
        }
        const expressionFor = (valueType: string, seen: ReadonlySet<string>): { expression: string; inputs: number } | undefined => {
          if (valueType === 'Swift.String') return { expression: '$value', inputs: 1 }
          if (/^\[[A-Za-z_]\w*\.[A-Za-z][\w.]*\]$/.test(valueType)) return { expression: '[]', inputs: 0 }
          if (seen.has(valueType) || seen.size > 3) return
          const [valueModule, ...valueOwner] = valueType.split('.')
          const valueName = valueOwner.join('.')
          if (!inventory.some((d) => d.module === valueModule && d.kind === 'struct' &&
            d.owner === valueOwner.slice(0, -1).join('.') && d.name === valueOwner.at(-1) &&
            !d.generic && present(d) && ios(d) <= ceiling)) return
          const statics = inventory.filter((d) => d.module === valueModule &&
            (d.owner === valueName || d.owner === valueType) && d.kind === 'static' &&
            d.name === 'default' && d.parameters.length === 0 &&
            (d.type === valueType || d.type === valueName) && present(d) && ios(d) <= ceiling)
          if (statics.length === 1) return { expression: `${valueType}.default`, inputs: 0 }
          const next = new Set([...seen, valueType])
          const expressions = inventory.filter((d) => d.module === valueModule &&
            (d.owner === valueName || d.owner === valueType) &&
            (d.kind === 'init' || d.kind === 'func' && d.isStatic && d.type === valueType) &&
            d.parameters.length > 0 && !d.requirements?.length && present(d) && ios(d) <= ceiling)
            .map((d) => {
              const argumentsOf = d.parameters.map((parameter) => expressionFor(parameter.type, next))
              if (argumentsOf.some((argument) => !argument)) return
              const inputs = argumentsOf.reduce((count, argument) => count + argument!.inputs, 0)
              if (inputs !== 1) return
              return { inputs, expression: `${valueType}${d.kind === 'func' ? `.${d.name}` : ''}(${d.parameters.map((parameter, index) =>
                `${parameter.label === '_' ? '' : `${parameter.label}: `}${argumentsOf[index]!.expression}`).join(', ')})` }
            }).filter((value) => value !== undefined)
          return expressions.length === 1 ? expressions[0] : undefined
        }
        const expression = expressionFor(baseType, new Set())
        if (expression?.inputs === 1)
          return { kind: 'string', type, optional, swiftExpression: expression.expression }
      }
      return
    }
    return { kind: 'enum', type, optional, cases }
  }
}

export type DerivedSlotArgument = DerivedArgument | { field: string; label: string; type: string; kind: 'bindingBoolean' | 'bindingString'; optional: false }
export type DerivedViewSlot = { name: string; sdkName?: string; module: string; label: string; ios: number; directValue?: true; closureInputs?: readonly string[]; contentWrapper?: string; preferenceKey?: string; preferenceEvent?: EventValueSchema; arguments: readonly DerivedSlotArgument[] }

export function deriveViewSlots(inventory: readonly Declaration[], ceiling: number): DerivedViewSlot[] {
  const valueOf = bridgeValueOf(inventory, ceiling)
  const isZeroInputClosure = (type: string) => /^(?:@escaping )?\(\) ->/.test(type)
  const closureInputsOf = (type: string) =>
    /^@escaping \(([^,<>()]+(?:, [^,<>()]+)*)\) -> some View$/.exec(type)?.[1].split(', ')
  const viewContentInitializers = new Map(inventory.filter((declaration) =>
    declaration.kind === 'init' && declaration.parameters.length === 1 &&
    declaration.parameters[0].type === '@escaping () -> Content' &&
    declaration.requirements?.includes('Content : SwiftUICore.View') &&
    present(declaration) && ios(declaration) <= ceiling)
    .map((declaration) => [`${declaration.module}.${declaration.owner}`, ios(declaration)]))
  const contentWrappers = inventory.filter((declaration) => declaration.kind === 'struct' &&
    declaration.inheritedTypes?.length && present(declaration) && ios(declaration) <= ceiling)
    .flatMap((wrapper) => {
      const initializerIOS = viewContentInitializers.get(`${wrapper.module}.${wrapper.name}`)
      return initializerIOS === undefined ? [] : wrapper.inheritedTypes!.map((protocol) =>
        ({ protocol, type: `${wrapper.module}.${wrapper.name}`,
          ios: Math.max(ios(wrapper), initializerIOS) }))
    })
  const contentWrapperOf = (d: Declaration, parameter: Declaration['parameters'][number]) => {
    const generic = /^(?:@escaping )?\(\) -> ([A-Za-z_]\w*)$/.exec(parameter.type)?.[1]
    const protocol = d.requirements?.find((requirement) => requirement.startsWith(`${generic} : `))?.split(' : ')[1]
    const matches = protocol === 'SwiftUICore.View' ? []
      : contentWrappers.filter((wrapper) => wrapper.protocol === protocol)
    return matches.length === 1 ? matches[0] : undefined
  }
  const isContent = (d: Declaration, parameter: Declaration['parameters'][number]) => {
    if (parameter.type === '() -> some View') return true
    if (closureInputsOf(parameter.type)) return true
    const generic = /^(?:@escaping )?\(\) -> ([A-Za-z_]\w*)$|^([A-Za-z_]\w*)\??$/.exec(parameter.type)
    return Boolean(generic && (d.requirements?.includes(`${generic[1] ?? generic[2]} : SwiftUICore.View`) ||
      contentWrapperOf(d, parameter)))
  }
  const isStringBinding = (d: Declaration, type: string) => {
    const generic = /^SwiftUICore\.Binding<([A-Za-z_]\w*)>$/.exec(type)?.[1]
    return Boolean(generic && d.requirements?.includes(`${generic} : Swift.Hashable`))
  }
  const slots = inventory.filter((d) => {
    const builders = d.parameters.filter((parameter) => isContent(d, parameter))
    return (
      d.kind === 'func' && (d.module === 'SwiftUI' || d.module === 'SwiftUICore' ||
        /^_[A-Za-z]+_SwiftUI$/.test(d.module)) &&
      d.owner.split('.').at(-1) === 'View' && /^[a-z]/.test(d.name) && builders.length === 1 &&
      d.parameters.at(-1) === builders[0] &&
      d.parameters.every((parameter) => parameter === builders[0] || parameter.defaultValue !== undefined ||
        ['enum', 'string', 'boolean'].includes(valueOf(parameter.type)?.kind ?? '') ||
        parameter.type === 'SwiftUICore.Binding<Swift.Bool>' ||
        isStringBinding(d, parameter.type)) &&
      present(d) && ios(d) <= ceiling
    )
  }).filter((slot, _, candidates) =>
    isZeroInputClosure(slot.parameters.at(-1)!.type) ||
    !candidates.some((other) => other.module === slot.module && other.name === slot.name &&
      isZeroInputClosure(other.parameters.at(-1)!.type)))
  const byName = new Map<string, Declaration[]>()
  for (const slot of slots) {
    const key = `${slot.module}.${slot.name}`
    byName.set(key, [...(byName.get(key) ?? []), slot])
  }
  const directSlots = [...byName].flatMap(([, declarations]) => declarations.map((slot) => {
    const content = slot.parameters.at(-1)!
    const contentWrapper = contentWrapperOf(slot, content)
    const closureInputs = closureInputsOf(content.type)
    const directValue = !isZeroInputClosure(content.type) && !closureInputs
    const required = slot.parameters.filter((parameter) =>
      parameter !== content && parameter.defaultValue === undefined)
    const suffix = declarations.length === 1 || required.length === 0 ? ''
      : `With${required.map((parameter) => isStringBinding(slot, parameter.type)
        ? 'BindingString' : parameter.type.split('.').at(-1)!.replace(/[^A-Za-z0-9]/g, '')).join('And')}`
    const directSuffix = declarations.length > 1 && directValue
      ? `With${content.label === '_' ? content.type.replace(/\?$/, '') : content.label[0].toUpperCase() + content.label.slice(1)}`
      : suffix
    return { name: `${slot.name}${directSuffix}`, ...(directSuffix ? { sdkName: slot.name } : {}), module: slot.module,
      label: content.label, ios: Math.max(ios(slot), contentWrapper?.ios ?? 0),
      ...(contentWrapper ? { contentWrapper: contentWrapper.type } : {}),
      ...(directValue ? { directValue: true as const } : {}),
      ...(closureInputs ? { closureInputs } : {}),
      arguments: slot.parameters.filter((parameter) =>
        parameter !== content && parameter.defaultValue === undefined)
        .map((parameter) => parameter.type === 'SwiftUICore.Binding<Swift.Bool>' || isStringBinding(slot, parameter.type)
          ? { field: parameter.name, label: parameter.label, type: parameter.type, kind: parameter.type === 'SwiftUICore.Binding<Swift.Bool>' ? 'bindingBoolean' as const : 'bindingString' as const, optional: false as const }
          : { ...valueOf(parameter.type)!, field: parameter.name, label: parameter.label }) }
  }))
  const preferenceMethods = inventory.filter((method) =>
    method.kind === 'func' && method.module === 'SwiftUICore' &&
    ['overlayPreferenceValue', 'backgroundPreferenceValue'].includes(method.name) &&
    method.owner.split('.').at(-1) === 'View' &&
    method.parameters.length === 3 && method.parameters[0].type === 'K.Type' &&
    method.parameters[1].defaultValue !== undefined &&
    method.parameters[2].type === '@escaping (K.Value) -> V' &&
    method.requirements?.includes('K : SwiftUICore.PreferenceKey') &&
    method.requirements?.includes('V : SwiftUICore.View') &&
    present(method) && ios(method) <= ceiling)
  const preferenceSlots: DerivedViewSlot[] = []
  for (const key of inventory.filter((declaration) => declaration.kind === 'struct' &&
    declaration.owner === '' && !declaration.generic &&
    declaration.inheritedTypes?.includes('SwiftUICore.PreferenceKey') &&
    present(declaration) && ios(declaration) <= ceiling)) {
    const valueAlias = inventory.find((declaration) => declaration.module === key.module &&
      declaration.owner === key.name && declaration.kind === 'typealias' &&
      declaration.name === 'Value' && present(declaration) && ios(declaration) <= ceiling)
    const value = valueOf(valueAlias?.type ?? '')
    if (!value || !['boolean', 'number', 'string', 'enum'].includes(value.kind)) continue
    const event: EventValueSchema = value.kind === 'enum'
      ? { kind: 'enum', cases: value.cases!.map((item) => item.name), open: true }
      : { kind: value.kind as 'boolean' | 'number' | 'string' }
    for (const method of preferenceMethods)
      preferenceSlots.push({ name: `${method.name}${key.name.replace(/Key$/, '')}`,
        sdkName: method.name, module: method.module, label: method.parameters[2].label,
        ios: Math.max(ios(method), ios(key), ios(valueAlias!)),
        preferenceKey: `${key.module}.${key.name}`,
        preferenceEvent: value.optional ? { kind: 'optional', value: event } : event,
        arguments: [],
      })
  }
  return [...directSlots, ...preferenceSlots].sort((a, b) => a.name.localeCompare(b.name))
}

// methods with bridgeable scalars and static-case values generate their props
// and Swift calls from the SDK parameter list.
export function deriveModifiers(
  inventory: readonly Declaration[],
  ceiling: number,
  reserved: readonly { name: string }[]
): DerivedModifier[] {
  const reservedNames = new Set(reserved.map((field) => field.name))
  const valueOf = bridgeValueOf(inventory, ceiling)
  const urlResultOf = (type: string) =>
    (/^@escaping \((?:_ [A-Za-z]\w*: )?Swift\.Result<(\[Foundation\.URL\]|Foundation\.URL), any Swift\.Error>\) -> Swift\.Void$/.exec(type) ??
      /^\(\(Swift\.Result<(\[Foundation\.URL\]|Foundation\.URL), any Swift\.Error>\) -> Swift\.Void\)\?$/.exec(type))?.[1]
  const eventValueOf = (type: string, version: number, seen = new Set<string>()): EventValueSchema | undefined => {
    const result = /^Swift\.Result<(.+), any Swift\.Error>$/.exec(type)
    if (result) {
      const value = eventValueOf(result[1], version, seen)
      return value && { kind: 'result', value }
    }
    const verified = /^StoreKit\.VerificationResult<(.+)>$/.exec(type)
    if (verified && inventory.some((declaration) => declaration.module === 'StoreKit' &&
      declaration.owner === 'StoreKit.VerificationResult' && declaration.name === 'jwsRepresentation' &&
      declaration.type === 'Swift.String' &&
      declaration.requirements?.includes(`SignedType == ${verified[1]}`) &&
      present(declaration) && ios(declaration) <= version))
      return { kind: 'verification' }
    if (type.endsWith('?')) {
      const value = eventValueOf(type.slice(0, -1), version, seen)
      return value && { kind: 'optional', value }
    }
    if (type.startsWith('[') && type.endsWith(']')) {
      const value = eventValueOf(type.slice(1, -1), version, seen)
      return value && { kind: 'array', value }
    }
    if (type === 'any Swift.Error') return { kind: 'description' }
    if (['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat'].includes(type)) return { kind: 'number' }
    if (type === 'Swift.String') return { kind: 'string' }
    if (type === 'Swift.Bool') return { kind: 'boolean' }
    if (type === 'CoreFoundation.CGPoint') return { kind: 'point' }
    if (type === 'CoreFoundation.CGSize') return { kind: 'size' }
    const generic = /^([^<]+)<(.+)>$/.exec(type)
    const concreteType = generic?.[1] ?? type
    const [module, ...parts] = concreteType.split('.')
    const owner = parts.join('.')
    const alias = inventory.find((d) => d.module === module && d.kind === 'typealias' &&
      (d.owner === parts.slice(0, -1).join('.') ||
        d.owner === [module, ...parts.slice(0, -1)].join('.')) &&
      d.name === parts.at(-1) && present(d) && ios(d) <= version)
    if (alias?.type === 'Swift.String') return { kind: 'string' }
    const nestedModule = parts.at(-2)?.startsWith('_') ? parts.at(-2) : undefined
    const nestedOwner = nestedModule ? [module, ...parts.slice(0, -2)].join('.') : undefined
    const enumDeclaration = inventory.find((d) => d.module === module && d.kind === 'enum' &&
      (d.owner === parts.slice(0, -1).join('.') ||
        d.owner === [module, ...parts.slice(0, -1)].join('.')) &&
      d.name === parts.at(-1) &&
      present(d) && ios(d) <= version) ??
      inventory.find((d) => d.module === nestedModule && d.kind === 'enum' &&
        d.owner === nestedOwner && d.name === parts.at(-1) && present(d) && ios(d) <= version) ??
      inventory.find((d) => d.kind === 'enum' && d.owner === [module, ...parts.slice(0, -1)].join('.') &&
        d.name === parts.at(-1) && present(d) && ios(d) <= version)
    if (enumDeclaration) {
      const caseOwner = nestedModule ? `${nestedOwner}.${parts.at(-1)}` : concreteType
      const cases = inventory.filter((d) => d.module === enumDeclaration.module &&
        (d.owner === owner || d.owner === caseOwner) && d.enumCase && present(d) && ios(d) <= ceiling)
      if ((enumDeclaration.attributes.includes('@frozen') || enumDeclaration.attributes.includes('@symbolgraph')) &&
        cases.length && cases.every((item) => item.parameters.length === 0) &&
        new Set(cases.map((item) => item.name)).size === cases.length)
        return { kind: 'enum', cases: cases.map((item) => item.name),
          ...(enumDeclaration.attributes.includes('@symbolgraph') ? { open: true as const } : {}) }
      if (cases.length && cases.some((item) => item.parameters.length) &&
        new Set(cases.map((item) => item.name)).size === cases.length) {
        const values = cases.map((item) => ({ name: item.name,
          values: item.parameters.map((parameter) => eventValueOf(
            generic && parameter.type === 'Value' ? generic[2] : parameter.type,
            version, new Set([...seen, type]))) }))
        if (values.every((item) => item.values.every(Boolean)))
          return { kind: 'associatedEnum', cases: values as { name: string; values: EventValueSchema[] }[],
            ...(!enumDeclaration.attributes.includes('@frozen') ? { open: true as const } : {}) }
      }
    }
    const parent = [...seen][0]?.replace(/<.*$/, '')
    const directEnumValue = seen.size === 1 && inventory.some((d) => d.kind === 'enum' &&
      d.name === parent?.split('.').at(-1) && present(d) && ios(d) <= version)
    if (!owner || seen.has(type) || !inventory.some((d) => d.module === module &&
      (d.kind === 'struct' || d.kind === 'class') &&
      (d.owner === parts.slice(0, -1).join('.') ||
        (seen.size === 0 || directEnumValue) &&
        d.owner === [module, ...parts.slice(0, -1)].join('.')) &&
      d.name === parts.at(-1) && !d.generic && present(d) && ios(d) <= version)) {
      const raw = inventory.find((d) => d.module === module && d.kind === 'struct' &&
        d.owner === [module, ...parts.slice(0, -1)].join('.') && d.name === parts.at(-1) &&
        d.inheritedTypes?.includes('Swift.RawRepresentable') && present(d) && ios(d) <= version) &&
        inventory.find((d) => d.module === module && d.kind === 'var' && d.owner === concreteType &&
          d.name === 'rawValue' && d.stored && ['Swift.String', 'Swift.Int'].includes(d.type ?? '') &&
          present(d) && ios(d) <= version)
      return raw ? { kind: 'object', fields: [{ name: 'rawValue',
        value: { kind: raw.type === 'Swift.String' ? 'string' : 'number' } }] } : undefined
    }
    const fields = inventory.filter((d) => d.module === module && (d.owner === owner || d.owner === type) &&
      d.kind === 'var' && d.stored && present(d) && ios(d) <= version)
    if (!fields.length || new Set(fields.map((field) => field.name)).size !== fields.length) return
    const next = new Set([...seen, type])
    const mapped = fields.flatMap((field) => {
      const value = eventValueOf(field.type ?? '', version, next)
      return value ? [{ name: field.name, value }] : []
    })
    return mapped.length ? { kind: 'object', fields: mapped } : undefined
  }
  const enumCallbackOf = (type: string) => {
    const single = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> Swift\.Void$/.exec(type)
    const pair = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+), (?:_ [A-Za-z]\w*: )?\1\) -> Swift\.Void$/.exec(type)
    const value = valueOf((single ?? pair)?.[1] ?? '')
    return value?.kind === 'enum' && (value.cases?.length ?? 0) >= 2
      ? { pair: Boolean(pair), cases: value.cases! }
      : undefined
  }
  const associatedCallbackOf = (type: string, version: number) => {
    const baseType = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> Swift\.Void$/.exec(type)?.[1]
    if (!baseType) return
    const [module, ...parts] = baseType.split('.')
    const owner = parts.join('.')
    if (!inventory.some((d) => d.module === module && d.kind === 'enum' &&
      d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
      d.attributes.includes('@frozen') && present(d))) return
    const cases = inventory.filter((d) => d.module === module && (d.owner === owner || d.owner === baseType) &&
      d.enumCase && present(d) && ios(d) <= version)
    if (cases.length < 2 || !cases.some((item) => item.parameters.length) ||
      new Set(cases.map((item) => item.name)).size !== cases.length) return
    const values = cases.map((item) => ({ name: item.name, values: item.parameters.map((parameter) =>
      eventValueOf(parameter.type, version)) }))
    return values.every((item) => item.values.every(Boolean))
      ? values as { name: string; values: EventValueSchema[] }[]
      : undefined
  }
  const structCallbackOf = (type: string, version: number) => {
    const baseType = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> (?:Swift\.Void|\(\))$/.exec(type)?.[1]
    const value = baseType && eventValueOf(baseType, version)
    return value?.kind === 'object' || value?.kind === 'point' ? value : undefined
  }
  const classUpdateOf = (type: string, version: number) => {
    const input = /^@escaping \(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> (?:Swift\.Void|\(\))$/.exec(type)?.[1]
    if (!input) return
    const [module, ...parts] = input.split('.')
    const owner = parts.join('.')
    if (!inventory.some((d) => d.module === module && d.kind === 'class' &&
      d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
      present(d) && ios(d) <= version)) return
    const fields = inventory.filter((d) => d.module === module &&
      (d.owner === owner || d.owner === input) && d.kind === 'var' && d.writable &&
      ['Swift.String', 'Swift.String?', 'Swift.Bool'].includes(d.type ?? '') &&
      present(d) && ios(d) <= version)
      .map((d) => ({ name: d.name, label: d.name, type: d.type! }))
    return fields.length ? { input, fields } : undefined
  }
  const styleCases = (style: string) => {
    const cases = inventory.filter((d) =>
      d.kind === 'static' && d.owner === style && d.parameters.length === 0 &&
      d.requirements?.length === 1 && d.requirements[0] === `Self == ${d.type}` &&
      /^[a-z]/.test(d.name) && present(d) && ios(d) <= ceiling
    ).map((d) => ({ name: d.name, ios: ios(d) }))
    return cases.length && new Set(cases.map((item) => item.name)).size === cases.length
      ? cases
      : undefined
  }
  const gestureOptions = inventory.filter((d) => d.kind === 'struct' && d.owner === '' &&
    !d.generic && /^[A-Z]/.test(d.name) &&
    d.inheritedTypes?.includes('SwiftUICore.Gesture') && present(d) && ios(d) <= ceiling)
    .flatMap((gesture) => {
      const constructor = inventory.find((d) => d.module === gesture.module &&
        (d.owner === gesture.name || d.owner === `${gesture.module}.${gesture.name}`) &&
        d.kind === 'init' && d.parameters.every((parameter) => parameter.defaultValue !== undefined) &&
        present(d) && ios(d) <= ceiling)
      if (!constructor) return []
      const eventValue = gesture.name === 'LongPressGesture'
        ? { kind: 'boolean' as const }
        : gesture.name === 'TapGesture'
          ? undefined
          : eventValueOf(`${gesture.module}.${gesture.name}.Value`, Math.max(ios(gesture), ios(constructor)))
      if (!eventValue && gesture.name !== 'TapGesture') return []
      return [{ name: gesture.name[0].toLowerCase() + gesture.name.slice(1).replace(/Gesture$/, ''),
        type: `${gesture.module}.${gesture.name}`, ios: Math.max(ios(gesture), ios(constructor)),
        ...(eventValue ? { eventValue } : {}) }]
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  const methods = inventory.filter(
    (d) =>
      d.kind === 'func' &&
      (d.module === 'SwiftUI' ||
        d.module === 'SwiftUICore' ||
        /^_[A-Za-z]+_SwiftUI$/.test(d.module)) &&
      d.owner.split('.').at(-1) === 'View' &&
      /^[a-z]/.test(d.name) &&
      present(d) &&
      ios(d) <= ceiling &&
      (!reservedNames.has(d.name) ||
        (!d.requirements?.length &&
          (d.parameters.length === 1 && valueOf(d.parameters[0].type)?.kind === 'enum' &&
            valueOf(d.parameters[0].type)?.optional ||
            d.parameters.length > 1 &&
              d.parameters.every((parameter) => parameter.defaultValue !== undefined) &&
              valueOf(d.parameters[0].type)?.kind === 'enum' ||
            d.parameters.length > 1 &&
              d.parameters.some((parameter) => parameter.defaultValue === undefined) &&
              d.parameters.some((parameter) => parameter.defaultValue !== undefined) &&
              d.parameters.every((parameter) => valueOf(parameter.type)))))
  )
  const byName = new Map<string, Declaration[]>()
  for (const method of methods)
    byName.set(method.name, [...(byName.get(method.name) ?? []), method])
  const result: DerivedModifier[] = []
  const publicNames = new Set([...reservedNames, ...byName.keys()])
  const environmentMethod = methods.find((method) => method.name === 'environment' &&
    method.module === 'SwiftUICore' && method.parameters.length === 2 &&
    method.parameters[0].type === 'Swift.WritableKeyPath<SwiftUICore.EnvironmentValues, V>' &&
    method.parameters[1].type === 'V')
  const transformEnvironmentMethod = methods.find((method) => method.name === 'transformEnvironment' &&
    method.module === 'SwiftUICore' && method.parameters.length === 2 &&
    method.parameters[0].type === 'Swift.WritableKeyPath<SwiftUICore.EnvironmentValues, V>' &&
    method.parameters[1].type === '@escaping (inout V) -> Swift.Void')
  if (environmentMethod) {
    for (const field of inventory.filter((declaration) =>
      (declaration.module === 'SwiftUI' || declaration.module === 'SwiftUICore' ||
        /^_[A-Za-z]+_SwiftUI$/.test(declaration.module)) &&
      declaration.owner.split('.').at(-1) === 'EnvironmentValues' &&
      declaration.kind === 'var' && declaration.writable && /^[a-z]/.test(declaration.name) &&
      present(declaration) && ios(declaration) <= ceiling)) {
      const value = valueOf(field.type ?? '')
      if (!value || !['boolean', 'number', 'string', 'enum'].includes(value.kind)) continue
      const kind = value.kind === 'enum'
        ? value.optional ? 'optionalEnum' : 'string'
        : value.optional
          ? `optional${value.kind[0].toUpperCase()}${value.kind.slice(1)}` as DerivedModifier['kind']
          : value.kind
      result.push({ name: `environment${field.name[0].toUpperCase()}${field.name.slice(1)}`,
        sdkName: 'environment', module: 'SwiftUICore', environmentKey: field.name,
        kind, type: field.type!, ios: Math.max(ios(environmentMethod), ios(field)),
        ...(field.module.startsWith('_') ? { framework: field.module.slice(1, -'_SwiftUI'.length) } : {}),
        ...(value.scalarConstructor ? { scalarConstructor: value.scalarConstructor } : {}),
        ...(value.swiftExpression ? { swiftExpression: value.swiftExpression } : {}),
        ...(value.cases ? { cases: value.cases } : {}),
      })
      if (transformEnvironmentMethod && !value.optional &&
        (value.kind === 'boolean' || value.kind === 'number' && field.type !== 'Swift.Int'))
        result.push({ name: `transformEnvironment${field.name[0].toUpperCase()}${field.name.slice(1)}`,
          sdkName: 'transformEnvironment', module: 'SwiftUICore', environmentKey: field.name,
          environmentTransform: value.kind === 'boolean' ? 'toggle' : 'add',
          kind: value.kind, type: field.type!,
          ios: Math.max(ios(transformEnvironmentMethod), ios(field)),
          ...(field.module.startsWith('_') ? { framework: field.module.slice(1, -'_SwiftUI'.length) } : {}),
        })
    }
  }
  const preferenceMethods = ['preference', 'transformPreference', 'onPreferenceChange']
    .map((name) => methods.find((method) => method.module === 'SwiftUICore' && method.name === name &&
      method.requirements?.includes('K : SwiftUICore.PreferenceKey') &&
      method.parameters[0]?.type === 'K.Type'))
  for (const key of inventory.filter((declaration) => declaration.kind === 'struct' &&
    declaration.owner === '' && !declaration.generic &&
    declaration.inheritedTypes?.includes('SwiftUICore.PreferenceKey') &&
    present(declaration) && ios(declaration) <= ceiling)) {
    const valueAlias = inventory.find((declaration) => declaration.module === key.module &&
      declaration.owner === key.name && declaration.kind === 'typealias' &&
      declaration.name === 'Value' && present(declaration) && ios(declaration) <= ceiling)
    const value = valueOf(valueAlias?.type ?? '')
    if (!value || !['boolean', 'number', 'string', 'enum'].includes(value.kind)) continue
    const baseName = key.name.replace(/Key$/, '')
    if (baseName === key.name) continue
    for (const [index, method] of preferenceMethods.entries()) {
      if (!method) continue
      const kind = index === 2 ? 'eventStruct' : value.kind === 'enum'
        ? value.optional ? 'optionalEnum' : 'string'
        : value.optional
          ? `optional${value.kind[0].toUpperCase()}${value.kind.slice(1)}` as DerivedModifier['kind']
          : value.kind
      const eventValue: EventValueSchema | undefined = index === 2
        ? value.kind === 'enum'
          ? { kind: 'enum', cases: value.cases!.map((item) => item.name), open: true }
          : { kind: value.kind as 'boolean' | 'number' | 'string' }
        : undefined
      result.push({ name: `${method.name}${baseName}`, sdkName: method.name,
        module: method.module, preferenceKey: `${key.module}.${key.name}`,
        preferenceOperation: index === 0 ? 'set' : index === 1 ? 'transform' : 'observe',
        kind, type: index === 2 ? method.parameters.at(-1)!.type : valueAlias!.type!,
        ios: Math.max(ios(method), ios(key), ios(valueAlias!)),
        ...(value.cases && index !== 2 ? { cases: value.cases } : {}),
        ...(eventValue ? { eventValue: value.optional ? { kind: 'optional', value: eventValue } : eventValue } : {}),
      })
    }
  }
  for (const [name, overloads] of byName) {
    const candidates = overloads.flatMap((method): DerivedModifier[] => {
      const framework = method.module.startsWith('_')
        ? { framework: method.module.slice(1, -'_SwiftUI'.length) }
        : {}
      const action = method.parameters.at(-1)
      const sessionType = /^@escaping \(_ [A-Za-z_]\w*: ([A-Za-z_]\w*\.[A-Za-z][\w.]*)\) async -> Swift\.Void$/.exec(action?.type ?? '')?.[1]
      if (sessionType && method.parameters.slice(0, -1).every((parameter) => parameter.defaultValue !== undefined)) {
        const [sessionModule, ...sessionParts] = sessionType.split('.')
        const sessionOwner = sessionParts.join('.')
        if (inventory.some((declaration) => declaration.module === sessionModule &&
          declaration.kind === 'class' && declaration.owner === sessionParts.slice(0, -1).join('.') &&
          declaration.name === sessionParts.at(-1) && present(declaration) && ios(declaration) <= ceiling)) {
          const requests = inventory.filter((declaration) => declaration.module === sessionModule &&
            declaration.kind === 'func' && declaration.owner === sessionOwner &&
            declaration.parameters.length === 1 && declaration.parameters[0].type === 'Swift.String' &&
            declaration.type?.startsWith(`${sessionType}.`) &&
            present(declaration) && ios(declaration) <= ceiling)
            .flatMap((request) => {
              const responseOwner = request.type!.slice(sessionModule.length + 1)
              const response = inventory.find((declaration) => declaration.module === sessionModule &&
                declaration.kind === 'struct' &&
                `${declaration.owner ? `${declaration.owner}.` : ''}${declaration.name}` === responseOwner &&
                present(declaration) && ios(declaration) <= ceiling)
              if (!response) return []
              const fields = inventory.filter((declaration) => declaration.module === sessionModule &&
                declaration.kind === 'var' && declaration.owner === responseOwner &&
                declaration.type === 'Swift.String' && present(declaration) && ios(declaration) <= ceiling)
              return fields.length ? [{ request, fields }] : []
            })
          if (requests.length === 1) {
            const { request, fields } = requests[0]
            return [{ name, module: method.module, kind: 'sessionRequest', type: action!.type,
              ios: Math.max(ios(method), ios(request), ...fields.map(ios)), ...framework,
              sessionRequest: { method: request.name,
                inputField: fields.find((field) => field.name.startsWith('source'))?.name ?? request.parameters[0].name,
                outputFields: fields.map((field) => field.name), actionLabel: action!.label,
                defaults: method.parameters.slice(0, -1).map((parameter) =>
                  ({ label: parameter.label, value: parameter.defaultValue! })) } }]
          }
        }
      }
      if (method.parameters.length >= 2 &&
        method.parameters[0].type === 'SwiftUICore.Binding<Swift.Bool>' &&
        /^([A-Za-z]\w*\.)+[A-Za-z]\w*\?$/.test(method.parameters[1].type) &&
        method.parameters.slice(2).every((parameter) => parameter.defaultValue !== undefined)) {
        const resultType = method.parameters[1].type
        const [requestModule, ...resultParts] = resultType.slice(0, -1).split('.')
        const requestOwner = `${resultParts.join('.')}Request`
        const request = inventory.find((declaration) => declaration.module === requestModule &&
          declaration.owner === requestOwner && declaration.kind === 'init' &&
          declaration.parameters.length === 1 &&
          declaration.parameters[0].label === 'coordinate' &&
          declaration.parameters[0].type === 'CoreLocation.CLLocationCoordinate2D' &&
          present(declaration) && ios(declaration) <= ceiling)
        const result = inventory.find((declaration) => declaration.module === requestModule &&
          declaration.owner === requestOwner && declaration.kind === 'var' &&
          declaration.type === resultType && declaration.attributes.includes('@async') &&
          present(declaration) && ios(declaration) <= ceiling)
        if (request && result)
          return [{ name, module: method.module, kind: 'asyncObjectRequest',
            type: resultType, ios: Math.max(ios(method), ios(request), ios(result)),
            requestType: `${requestModule}.${requestOwner}`, requestProperty: result.name,
            predicateLabel: method.parameters[0].label, label: method.parameters[1].label,
            ...framework }]
      }
      if (method.parameters.length === 2 &&
        method.parameters[0].type === '@autoclosure @escaping () -> Swift.Array<ItemID>' &&
        method.parameters[1].type === 'SwiftUICore.Namespace.ID?' &&
        method.parameters[1].defaultValue !== undefined &&
        method.requirements?.includes('ItemID : Swift.Hashable') &&
        method.requirements.includes('ItemID : Swift.Sendable'))
        return [{ name, module: method.module, kind: 'dragSelection', type: method.parameters[0].type,
          ios: ios(method), ...framework }]
      if (method.parameters.length === 4 &&
        method.parameters[0].type === 'Item.Type' && method.parameters[0].defaultValue !== undefined &&
        method.parameters[1].type === 'Swift.KeyPath<Item, ItemID>' &&
        method.parameters[2].type === 'SwiftUICore.Namespace.ID?' &&
        method.parameters[3].type === '@escaping (_ draggedItemIDs: Swift.Array<ItemID>) -> Data' &&
        ['ItemID : Swift.Hashable', 'ItemID : Swift.Sendable', 'Item : CoreTransferable.Transferable',
          'Item == Data.Element', 'Data : Swift.Collection'].every((requirement) =>
          method.requirements?.includes(requirement)))
        return [{ name, module: method.module, kind: 'dragContainer', type: method.parameters[3].type,
          ios: ios(method), ...framework }]
      if (method.parameters.length === 2 && method.parameters[0].type === 'P' &&
        method.parameters[1].label === 'perform' &&
        method.parameters[1].type === '@escaping (P.Output) -> Swift.Void' &&
        method.requirements?.includes('P : Combine.Publisher') &&
        method.requirements.includes('P.Failure == Swift.Never'))
        return [{ name, module: method.module, kind: 'eventNotification', type: 'P',
          ios: ios(method), ...framework }]
      if (method.parameters.length === 3 && method.parameters[0].label === 'of' &&
        method.parameters[0].type === '[Swift.String]' &&
        method.parameters[1].label === 'isTargeted' &&
        method.parameters[1].type === 'SwiftUICore.Binding<Swift.Bool>?' &&
        method.parameters[2].label === 'perform' &&
        method.parameters[2].type === '@escaping (_ providers: [Foundation.NSItemProvider]) -> Swift.Bool')
        return [{ name, module: method.module, kind: 'eventDrop', type: '[Swift.String]', ios: ios(method),
          eventValue: { kind: 'object', fields: [
            { name: 'type', value: { kind: 'string' } },
            { name: 'data', value: { kind: 'string' } },
          ] }, ...framework }]
      const namespaceIndex = method.parameters.findIndex((parameter) =>
        parameter.type === 'SwiftUICore.Namespace.ID')
      if (namespaceIndex !== -1) {
        const required = method.parameters.filter((parameter, index) =>
          index !== namespaceIndex && parameter.defaultValue === undefined)
        if (!required.length && method.parameters.length === 1)
          return [{ name, module: method.module, kind: 'boolean', type: '', ios: ios(method),
            zeroArgument: true,
            namespaceParameter: { index: 0, label: method.parameters[namespaceIndex].label },
            ...framework }]
        const argumentsFromSDK = required.map((parameter) => {
          const generic = parameter.type === 'some Hashable' ||
            parameter.type === '(some (Hashable & Sendable))?' ||
            method.requirements?.includes(`${parameter.type.replace(/\?$/, '')} : Swift.Hashable`)
          const value = generic
            ? { kind: 'string' as const, type: parameter.type.endsWith('?') ? 'Swift.String?' : 'Swift.String',
              sdkType: parameter.type, optional: parameter.type.endsWith('?') }
            : valueOf(parameter.type)
          return value && { ...value, field: parameter.name, label: parameter.label }
        })
        if (required.length && argumentsFromSDK.every(Boolean) &&
          new Set(argumentsFromSDK.map((argument) => argument!.field)).size === required.length)
          return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
            arguments: argumentsFromSDK as DerivedArgument[],
            namespaceParameter: {
              index: method.parameters.slice(0, namespaceIndex).filter((parameter) =>
                parameter.defaultValue === undefined).length,
              label: method.parameters[namespaceIndex].label,
            },
            ...framework }]
        return []
      }
      const objectFactories = method.parameters.map((parameter) => {
        const type = parameter.type.replace(/\?$/, '')
        if (parameter.defaultValue !== undefined || valueOf(parameter.type)) return []
        return inventory.filter((declaration) => declaration.module === type.split('.')[0] &&
          declaration.owner === type.split('.').slice(1).join('.') &&
          declaration.kind === 'func' && declaration.isStatic &&
          declaration.type === type && declaration.parameters.length === 0 &&
          present(declaration) && ios(declaration) <= ceiling)
      })
      const sharedIndex = objectFactories.findIndex((factories) => factories.length === 1)
      if (sharedIndex !== -1) {
        const factory = objectFactories[sharedIndex][0]
        const required = method.parameters.filter((parameter, index) =>
          index !== sharedIndex && parameter.defaultValue === undefined)
        const argumentsFromSDK = required.map((parameter) => {
          const value = parameter.type === 'SwiftUICore.Binding<Swift.Bool>'
            ? { kind: 'bindingBoolean' as const, type: parameter.type, optional: false }
            : valueOf(parameter.type)
          return value && { ...value, field: parameter.name, label: parameter.label }
        })
        if (required.length && argumentsFromSDK.every(Boolean) &&
          new Set(argumentsFromSDK.map((argument) => argument!.field)).size === required.length)
          return [{ name, module: method.module, kind: 'record', type: '', ios: Math.max(ios(method), ios(factory)),
            arguments: argumentsFromSDK as DerivedArgument[],
            ...(factory.name === 'shared' ? {} : { aliasSuffix:
              (factory.name.startsWith('for') ? factory.name.slice(3) : factory.name[0].toUpperCase() + factory.name.slice(1)) +
              required.filter((parameter) => parameter.type !== 'SwiftUICore.Binding<Swift.Bool>')
                .map((parameter) => `And${parameter.name[0].toUpperCase()}${parameter.name.slice(1)}`).join('') }),
            sharedParameter: {
              index: method.parameters.slice(0, sharedIndex).filter((parameter) =>
                parameter.defaultValue === undefined).length,
              label: method.parameters[sharedIndex].label,
              type: method.parameters[sharedIndex].type.replace(/\?$/, ''),
              ...(factory.name === 'shared' ? {} : { factoryName: factory.name }),
            }, ...framework }]
        return []
      }
      const factoryIndex = method.parameters.findIndex((parameter) =>
        /^(?:@escaping )?\(\) -> [A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+$/.test(parameter.type) &&
        parameter.defaultValue === undefined)
      if (factoryIndex !== -1 && !method.requirements?.length) {
        const factory = method.parameters[factoryIndex]
        const returnType = factory.type.replace(/^(?:@escaping )?\(\) -> /, '')
        const possibleTypes = [returnType, ...inventory.filter((declaration) =>
          declaration.kind === 'class' && declaration.inheritedTypes?.includes(returnType) &&
          present(declaration) && ios(declaration) <= ceiling)
          .map((declaration) => `${declaration.module}.${declaration.owner ? `${declaration.owner}.` : ''}${declaration.name}`)]
        const constructors = inventory.filter((declaration) =>
          possibleTypes.includes(`${declaration.module}.${declaration.owner}`) &&
          declaration.kind === 'init' &&
          !declaration.requirements?.length && present(declaration) && ios(declaration) <= ceiling &&
          declaration.parameters.some((parameter) => parameter.defaultValue === undefined) &&
          declaration.parameters.filter((parameter) => parameter.defaultValue === undefined)
            .every((parameter) => valueOf(parameter.type)))
        const required = method.parameters.filter((parameter, index) =>
          index !== factoryIndex && parameter.defaultValue === undefined)
        const argumentsFromSDK = required.map((parameter) => {
          const value = parameter.type === 'SwiftUICore.Binding<Swift.Bool>'
            ? { kind: 'bindingBoolean' as const, type: parameter.type, optional: false }
            : valueOf(parameter.type)
          return value && { ...value, field: parameter.name, label: parameter.label }
        })
        if (constructors.length && argumentsFromSDK.every(Boolean))
          return constructors.filter((constructor) => constructors.filter((other) =>
            other.module === constructor.module && other.owner === constructor.owner).length === 1)
            .flatMap((constructor) => {
              const constructorArguments = constructor.parameters
                .filter((parameter) => parameter.defaultValue === undefined)
                .map((parameter) => ({ ...valueOf(parameter.type)!, field: parameter.name, label: parameter.label }))
              const argumentsList = [...argumentsFromSDK as DerivedArgument[], ...constructorArguments]
              if (new Set(argumentsList.map((argument) => argument.field)).size === argumentsList.length) {
                const type = `${constructor.module}.${constructor.owner}`
                return [{ name, module: method.module, kind: 'record' as const, type: '',
                  ios: Math.max(ios(method), ios(constructor)), arguments: argumentsList,
                  ...(type !== returnType ? { aliasSuffix: type.split('.').at(-1) } : {}),
                  factoryParameter: {
                    index: method.parameters.slice(0, factoryIndex).filter((parameter) =>
                      parameter.defaultValue === undefined).length,
                    label: factory.label, type, returnType, argumentOffset: required.length,
                  }, ...framework }]
              }
              return []
            })
      }
      if (method.parameters.length === 3 &&
        method.parameters[0].type === 'SwiftUICore.Text' &&
        method.parameters[1].type === '[EntryModel]' &&
        method.parameters[2].type === 'Swift.KeyPath<EntryModel, Swift.String>' &&
        method.requirements?.includes('EntryModel : Swift.Identifiable'))
        return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
          arguments: [
            { ...valueOf(method.parameters[0].type)!, field: method.parameters[0].name,
              label: method.parameters[0].label },
            { field: method.parameters[1].name, label: method.parameters[1].label,
              kind: 'stringArray', type: '[OneNativeRotorEntry]', sdkType: '[EntryModel]',
              optional: false, unique: true,
              swiftExpression: '$value.map { OneNativeRotorEntry(id: $0) }' },
          ],
          fixedParameter: { index: 2, label: method.parameters[2].label,
            type: method.parameters[2].type, expression: '\\OneNativeRotorEntry.label' },
          ...framework }]
      const genericTransform = method.parameters.length === 3 &&
        method.parameters[0].type === 'T.Type' &&
        method.requirements?.some((requirement) =>
          requirement === 'T : Swift.Equatable' || requirement === 'T : Swift.Hashable') &&
        method.requirements.every((requirement) =>
          requirement === 'T : Swift.Equatable' || requirement === 'T : Swift.Hashable' ||
          requirement === 'T : Swift.Sendable') &&
        /^@escaping (?:@Sendable )?\(SwiftUICore\.(ScrollGeometry|GeometryProxy)\) -> T$/.exec(method.parameters[1].type) &&
        /^@escaping \((?:_ [A-Za-z]\w*: )?T, (?:_ [A-Za-z]\w*: )?T\) -> Swift\.Void$/.test(method.parameters[2].type)
      if (genericTransform) {
        const input = /^@escaping (?:@Sendable )?\(SwiftUICore\.(ScrollGeometry|GeometryProxy)\) -> T$/.exec(method.parameters[1].type)![1]
        return inventory.filter((field) => field.module === 'SwiftUICore' &&
          (field.owner === input || field.owner === `SwiftUICore.${input}`) &&
          field.kind === 'var' &&
          (field.type === 'CoreFoundation.CGPoint' || field.type === 'CoreFoundation.CGSize') &&
          present(field) && ios(field) <= ceiling)
          .map((field) => {
            const value: EventValueSchema = { kind: field.type === 'CoreFoundation.CGPoint' ? 'point' : 'size' }
            return { name: `${name}With${field.name[0].toUpperCase()}${field.name.slice(1)}`,
              sdkName: name, module: method.module, kind: 'eventStruct',
              type: method.parameters[2].type, label: method.parameters[2].label,
              eventValue: { kind: 'object', fields: [
                { name: 'oldValue', value }, { name: 'newValue', value },
              ] }, eventPair: true as const, transformMember: field.name,
              callArguments: [
                { label: method.parameters[0].label, defaultValue: `${field.type}.self` },
                { label: method.parameters[1].label, defaultValue: `{ $0.${field.name} }` },
                { label: method.parameters[2].label, bridge: true as const },
              ], ios: Math.max(ios(method), ios(field)), ...framework }
          })
      }
      if (method.requirements?.length) {
        if (method.requirements.length === 2 && method.parameters.length >= 1 &&
          method.parameters.slice(1).every((parameter) => parameter.defaultValue !== undefined)) {
          const constraints = method.requirements.map((requirement) =>
            /^([A-Za-z_]\w*) : ([A-Za-z_]\w*\.[A-Za-z][\w.]*)$/.exec(requirement))
          if (constraints.every(Boolean) && constraints[0]![1] === constraints[1]![1] &&
            method.parameters[0].type === constraints[0]![1]) {
            for (const [base, marker] of [[constraints[0]![2], constraints[1]![2]],
              [constraints[1]![2], constraints[0]![2]]]) {
              const cases = inventory.filter((declaration) =>
                declaration.kind === 'static' && declaration.owner === base &&
                declaration.requirements?.length === 1 &&
                declaration.requirements[0] === `Self == ${declaration.type}` &&
                declaration.parameters.length === 0 && /^[a-z]/.test(declaration.name) &&
                present(declaration) && ios(declaration) <= ceiling)
                .flatMap((declaration) => {
                  const conformance = inventory.find((item) => item.kind === 'conformance' &&
                    item.module === declaration.module && item.name === declaration.type &&
                    !item.requirements?.length && item.inheritedTypes?.includes(marker) &&
                    present(item) && ios(item) <= ceiling)
                  return conformance
                    ? [{ name: declaration.name, ios: Math.max(ios(declaration), ios(conformance)) }]
                    : []
                })
              if (cases.length && new Set(cases.map((item) => item.name)).size === cases.length)
                return [{ name, module: method.module, kind: 'style', type: method.parameters[0].type,
                  ios: ios(method), cases,
                  ...(base.split('.')[0] === 'SwiftUICore' ? framework : { framework: base.split('.')[0] }) }]
            }
          }
        }
        if (method.requirements.length !== 1) return []
        const focusValue = /^([A-Za-z_]\w*) : Swift\.Hashable$/.exec(method.requirements[0])?.[1]
        if (focusValue && method.parameters.length >= 2 &&
          new RegExp(`^SwiftUI\\.(?:Accessibility)?FocusState<${focusValue}>\\.Binding$`).test(method.parameters[0].type) &&
          method.parameters[1].type === focusValue && method.parameters[1].label === '_' &&
          method.parameters.slice(2).every((parameter) => parameter.defaultValue !== undefined))
          return [{ name, module: method.module, kind: 'defaultFocusBoolean',
            type: method.parameters[0].type, ios: ios(method), ...framework }]
        const gestureType = /^([A-Za-z_]\w*) : SwiftUICore\.Gesture$/.exec(method.requirements[0])?.[1]
        if (gestureType && gestureOptions.length && method.parameters[0]?.type === gestureType &&
          method.parameters.slice(1).every((parameter) => parameter.defaultValue !== undefined) &&
          inventory.some((d) => d.module === 'SwiftUICore' && d.owner.split('.').at(-1) === 'Gesture' &&
            d.kind === 'func' && d.name === 'onEnded' && present(d)))
          return [{ name, module: method.module, kind: 'gesture', type: gestureType,
            label: method.parameters[0].label, gestureOptions,
            ios: ios(method), ...framework }]
        const transferable = /^([A-Za-z_]\w*) : CoreTransferable\.Transferable$/.exec(method.requirements[0])?.[1]
        if (transferable) {
          const [first, action, ...defaults] = method.parameters
          const arrayType = `@autoclosure @escaping () -> [${transferable}]`
          const valueType = `@autoclosure @escaping () -> ${transferable}`
          const required = method.parameters.filter((parameter) => parameter.defaultValue === undefined)
          const arrayStructCallback = method.parameters.find((parameter) =>
            new RegExp(`^@escaping \\(_ [A-Za-z]\\w*: \\[${transferable}\\], _ [A-Za-z]\\w*: [A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)+\\) -> Swift\\.Void$`).test(parameter.type))
          const structType = arrayStructCallback && new RegExp(`^@escaping \\(_ [A-Za-z]\\w*: \\[${transferable}\\], _ [A-Za-z]\\w*: ([A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)+)\\) -> Swift\\.Void$`).exec(arrayStructCallback.type)?.[1]
          const structValue = structType && eventValueOf(structType, ios(method))
          if (first?.type === `${transferable}.Type` && first.defaultValue !== undefined &&
            arrayStructCallback && structValue && method.parameters.every((parameter) =>
              parameter === arrayStructCallback || parameter.defaultValue !== undefined))
            return [{ name, module: method.module, kind: 'eventStruct',
              type: arrayStructCallback.type, label: arrayStructCallback.label,
              eventValue: { kind: 'object', fields: [
                { name: 'items', value: { kind: 'array', value: { kind: 'string' } } },
                { name: 'session', value: structValue },
              ] }, eventInputs: ['items', 'session'],
              callArguments: method.parameters.map((parameter) =>
                parameter === first ? { label: parameter.label, defaultValue: 'String.self' } :
                  parameter === arrayStructCallback ? { label: parameter.label, bridge: true as const } :
                    { label: parameter.label, defaultValue: parameter.defaultValue }),
              ios: ios(method), ...framework }]
          if (required.length === 3 && required[0].type === 'SwiftUICore.Binding<Swift.Bool>' &&
            required[1].type === `${transferable}?` && urlResultOf(required[2].type) === 'Foundation.URL')
            return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
              arguments: [
                { field: required[0].name, label: required[0].label, type: required[0].type,
                  kind: 'bindingBoolean', optional: false },
                { field: required[1].name, label: required[1].label, type: 'Swift.String?',
                  sdkType: required[1].type, kind: 'string', optional: true },
                { field: required[2].name, label: required[2].label, type: required[2].type,
                  kind: 'resultURL', optional: false },
              ], ...framework }]
          if (method.parameters.length === 1 && (first.type === arrayType || first.type === valueType))
            return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
              arguments: [{ field: first.name || 'value', label: first.label,
                type: first.type === arrayType ? '[Swift.String]' : 'Swift.String',
                sdkType: first.type, kind: first.type === arrayType ? 'stringArray' : 'string', optional: false }],
              ...framework }]
          if (first?.type === `${transferable}.Type` && first.defaultValue !== undefined &&
            action?.type === `@escaping () -> [${transferable}]` &&
            defaults.every((parameter) => parameter.defaultValue !== undefined))
            return [{ name, module: method.module, kind: 'eventReturnArray', type: action.type,
              callArguments: method.parameters.map((parameter) =>
                parameter === first ? { label: parameter.label, defaultValue: 'String.self' } :
                  parameter === action ? { label: parameter.label, bridge: true as const } :
                    { label: parameter.label, defaultValue: parameter.defaultValue }),
              ios: ios(method), ...framework }]
          if (first?.type === `${transferable}.Type` && first.defaultValue !== undefined &&
            new RegExp(`^@escaping \\((?:_ [A-Za-z]\\w*: )?\\[${transferable}\\]\\) -> Swift\\.Void$`).test(action?.type ?? '') &&
            defaults.every((parameter) => parameter.defaultValue !== undefined))
            return [{ name, module: method.module, kind: 'eventStruct', type: action.type,
              label: action.label, eventValue: { kind: 'array', value: { kind: 'string' } },
              callArguments: method.parameters.map((parameter) =>
                parameter === first ? { label: parameter.label, defaultValue: 'String.self' } :
                  parameter === action ? { label: parameter.label, bridge: true as const } :
                    { label: parameter.label, defaultValue: parameter.defaultValue }),
              ios: ios(method), ...framework }]
        }
        const arrayID = /^([A-Za-z_]\w*) : Swift.Hashable$/.exec(method.requirements[0])?.[1]
        if (arrayID && method.parameters.length === 3 &&
          method.parameters[0].type === `${arrayID}.Type` &&
          method.parameters[1].defaultValue !== undefined &&
          method.parameters[2].type === `@escaping ([${arrayID}]) -> Swift.Void`)
          return [{ name, module: method.module, kind: 'eventStruct',
            type: method.parameters[2].type, label: method.parameters[2].label,
            eventValue: { kind: 'array', value: { kind: 'string' } },
            callArguments: [
              { label: method.parameters[0].label, defaultValue: 'String.self' },
              { label: method.parameters[1].label, defaultValue: method.parameters[1].defaultValue },
              { label: method.parameters[2].label, bridge: true },
            ], ios: ios(method), ...framework }]
        const styleRequirement = /^([A-Za-z_]\w*) : ([A-Za-z_]\w*\.[A-Za-z][\w.]*)$/.exec(method.requirements[0])
        const style = styleRequirement?.[2]
        if (styleRequirement && style && method.parameters[0]?.type === styleRequirement[1] &&
          (((styleRequirement[1] === 'S' || style === 'SwiftUICore.InsettableShape') && method.parameters.length === 1) || (style === 'SwiftUICore.Shape' &&
            method.parameters.slice(1).every((parameter) => parameter.defaultValue !== undefined)))) {
          const cases = styleCases(style === 'SwiftUICore.InsettableShape' ? 'SwiftUICore.Shape' : style)
          if (cases) return [{ name, module: method.module, kind: 'style', type: styleRequirement[1], ios: ios(method), cases, ...framework }]
        }
        const hashable = /^([A-Za-z_]\w*) : Swift.Hashable$/.exec(method.requirements[0])?.[1]
        const equatable = /^([A-Za-z_]\w*) : Swift.Equatable$/.exec(method.requirements[0])?.[1]
        const [value, ...defaults] = method.parameters
        if (hashable && value?.type === hashable && defaults.every((parameter) => parameter.defaultValue !== undefined))
          return [{ name, module: method.module, kind: 'string', type: hashable, ios: ios(method), ...framework,
            ...(value.label === '_' ? {} : { label: value.label }) }]
        if (equatable && method.parameters.length === 2 && value?.type === equatable &&
          method.parameters[1].type === `@escaping (_ newValue: ${equatable}) -> Swift.Void`)
          return [{ name, module: method.module, kind: 'eventValueString', type: equatable,
            label: value.label, callbackLabel: method.parameters[1].label, ios: ios(method), ...framework }]
        if (equatable && method.parameters.length === 2 && method.parameters.some((parameter) => parameter.type === equatable)) {
          const argumentsFromSDK = method.parameters.map((parameter, index) => {
            const bridged = parameter.type === equatable
              ? { kind: 'string' as const, type: 'Swift.String', sdkType: equatable, optional: false }
              : valueOf(parameter.type)
            return bridged && { ...bridged, field: parameter.name || `argument${index + 1}`, label: parameter.label }
          })
          if (argumentsFromSDK.every(Boolean))
            return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
              arguments: argumentsFromSDK as DerivedArgument[], ...framework }]
        }
        const generic = method.parameters.length === 1 && method.requirements?.length === 1 &&
          /^([A-Za-z_]\w*) : ([A-Za-z_]\w*\.[A-Za-z][\w.]*)$/.exec(method.requirements[0])
        if (generic && method.parameters[0].type === generic[1]) {
          const constructors = inventory.filter((declaration) => declaration.kind === 'struct' &&
            declaration.owner === '' && !declaration.generic &&
            declaration.inheritedTypes?.includes(generic[2]) &&
            present(declaration) && ios(declaration) <= ceiling)
            .flatMap((conformer) => inventory.filter((declaration) =>
              declaration.kind === 'init' && declaration.module === conformer.module &&
              (declaration.owner === conformer.name || declaration.owner === `${conformer.module}.${conformer.name}`) &&
              !declaration.requirements?.length && declaration.parameters.length > 0 &&
              declaration.parameters.every((parameter) => valueOf(parameter.type)) &&
              present(declaration) && ios(declaration) <= ceiling)
              .map((initializer) => ({ conformer, initializer })))
          if (constructors.length === 1) {
            const { conformer, initializer } = constructors[0]
            return [{ name, module: method.module, kind: 'record', type: '',
              ios: Math.max(ios(method), ios(conformer), ios(initializer)),
              ...(conformer.module === 'SwiftUI' || conformer.module === 'SwiftUICore'
                ? framework : { framework: conformer.module }),
              constructorParameter: { type: `${conformer.module}.${conformer.name}`,
                label: method.parameters[0].label },
              arguments: initializer.parameters.map((parameter) =>
                ({ ...valueOf(parameter.type)!, field: parameter.name, label: parameter.label })) }]
          }
        }
        return []
      }
      if (method.parameters.length === 2) {
        const [predicate, signer] = method.parameters
        const decisionClosure = /^@escaping \((.+)\) -> (Swift\.Bool|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+\?)$/.exec(predicate.type)
        const stringInputs = /^@escaping \((.+)\) async throws -> Swift\.String$/.exec(signer.type)?.[1]
        const parseInputs = (inputs: string | undefined) => inputs?.split(', ').map((part) =>
          /^_ ([A-Za-z_]\w*): ([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)$/.exec(part))
        const decision = parseInputs(decisionClosure?.[1])
        const signing = parseInputs(stringInputs)
        const booleanDecision = decisionClosure?.[2] === 'Swift.Bool'
        const selectedType = booleanDecision ? undefined : decisionClosure?.[2].slice(0, -1)
        const possibleSelections = selectedType && decision?.every(Boolean) && signing?.every(Boolean) &&
          signing.length === decision.length + 1 && signing.at(-1)![2] === selectedType &&
          inventory.some((declaration) => declaration.kind === 'var' && declaration.name === 'id' &&
            declaration.owner === selectedType && ['Swift.String', 'Swift.String?'].includes(declaration.type ?? '') &&
            present(declaration) && ios(declaration) <= ceiling)
          ? decision.flatMap((input, index) => inventory.filter((declaration) =>
            declaration.kind === 'var' && declaration.owner === input![2] &&
            declaration.type === `[${selectedType}]` && present(declaration) && ios(declaration) <= ceiling)
            .map((member) => ({ member, index }))) : []
        const namedSelections = possibleSelections.filter(({ member }) =>
          member.name === `${signing?.at(-1)?.[1]}s`)
        const selection = namedSelections.length === 1 ? namedSelections[0]
          : possibleSelections.length === 1 ? possibleSelections[0] : undefined
        if (predicate.label !== '_' && signer.label !== '_' && decision?.length &&
          signing && decision.every(Boolean) && signing.every(Boolean) &&
          (booleanDecision && signing.length === decision.length || selection) &&
          decision.every((input, index) => input![2] === signing[index]![2])) {
          const values = signing.map((input) => eventValueOf(input![2], ios(method)))
          if (values.every(Boolean))
            return [{ name, module: method.module, kind: 'eventAsyncString', type: signer.type,
              predicateLabel: predicate.label, callbackLabel: signer.label,
              ...(selection ? { selectionMember: selection.member.name, selectionInputIndex: selection.index } : {}),
              eventInputs: signing.map((input) => input![1]),
              eventValue: { kind: 'object', fields: signing.map((input, index) =>
                ({ name: input![1], value: values[index]! })) },
              ios: selection ? Math.max(ios(method), ios(selection.member)) : ios(method), ...framework }]
        }
      }
      const asyncAction = method.parameters.find((parameter) =>
        /^(?:sending )?@escaping (?:@Sendable |@isolated\(any\) )?\(\) async -> Swift\.Void$/.test(parameter.type))
      if (asyncAction && method.parameters.every((parameter) =>
        parameter === asyncAction || parameter.defaultValue !== undefined))
        return [{ name, module: method.module, kind: 'eventAsync', type: asyncAction.type,
          label: asyncAction.label, ios: ios(method), ...framework }]
      const asyncValue = method.parameters.find((parameter) =>
        /^\(\(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) async -> \(\)\)\?$/.test(parameter.type))
      if (asyncValue && method.parameters.every((parameter) =>
        parameter === asyncValue || parameter.defaultValue !== undefined)) {
        const input = /^\(\(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) async -> \(\)\)\?$/.exec(asyncValue.type)![1]
        const value = eventValueOf(input, ios(method))
        if (value?.kind === 'object')
          return [{ name, module: method.module, kind: 'eventAsyncStruct', type: asyncValue.type,
            label: asyncValue.label, eventInputType: input, eventValue: value,
            ios: ios(method), ...framework }]
      }
      const asyncResult = method.parameters.find((parameter) =>
        /^\(\(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+), (Swift\.Result<.+, any Swift\.Error>)\) async -> \(\)\)\?$/.test(parameter.type))
      if (asyncResult && method.parameters.every((parameter) =>
        parameter === asyncResult || parameter.defaultValue !== undefined)) {
        const input = /^\(\(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+), (Swift\.Result<.+, any Swift\.Error>)\) async -> \(\)\)\?$/.exec(asyncResult.type)!
        const first = eventValueOf(input[1], ios(method))
        const second = eventValueOf(input[2], ios(method))
        if (first && second)
          return [{ name, module: method.module, kind: 'eventAsyncStruct', type: asyncResult.type,
            label: asyncResult.label, eventInputs: ['first', 'result'],
            eventValue: { kind: 'object', fields: [
              { name: 'value', value: first }, { name: 'result', value: second },
            ] }, ios: ios(method), ...framework }]
      }
      const asyncState = method.parameters.find((parameter) =>
        /^@escaping \(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*(?:<.+>)?)+)\) async -> \(\)$/.test(parameter.type))
      const requiredInput = method.parameters.filter((parameter) =>
        parameter !== asyncState && parameter.defaultValue === undefined)
      if (asyncState && requiredInput.length === 1 && method.parameters.every((parameter) =>
        parameter === asyncState || parameter === requiredInput[0] || parameter.defaultValue !== undefined)) {
        const input = /^@escaping \((.+)\) async -> \(\)$/.exec(asyncState.type)![1]
        const collectionElement = /^some Collection<([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)> & Sendable & Equatable$/.exec(requiredInput[0].type)?.[1]
        const collectionAlias = collectionElement && inventory.filter((declaration) =>
          declaration.kind === 'typealias' && declaration.type === 'Swift.String' &&
          declaration.owner === collectionElement.split('.').slice(0, -1).join('.') &&
          declaration.name === collectionElement.split('.').at(-1) &&
          present(declaration) && ios(declaration) <= ceiling)
        const argument = valueOf(requiredInput[0].type) ??
          (collectionAlias?.length === 1
            ? { kind: 'stringArray' as const, type: '[Swift.String]', optional: false }
            : undefined)
        const eventValue = eventValueOf(input, ios(method))
        if ((argument?.kind === 'string' || argument?.kind === 'stringArray') && eventValue)
          return [{ name, module: method.module, kind: 'eventAsyncStruct', type: asyncState.type,
            label: asyncState.label, eventInputType: input, eventValue,
            arguments: [{ ...argument, field: requiredInput[0].name, label: requiredInput[0].label }],
            ios: ios(method), ...framework }]
      }
      const visualClosure = method.parameters.at(-1)
      const visualInput = visualClosure &&
        /^@escaping @Sendable \(SwiftUICore\.EmptyVisualEffect, (SwiftUICore\.GeometryProxy|SwiftUI\.ScrollTransitionPhase)\) -> some VisualEffect$/.exec(visualClosure.type)?.[1]
      if (visualInput && method.parameters.every((parameter) =>
        parameter === visualClosure || parameter.defaultValue !== undefined)) {
        const cases = inventory.filter((declaration) => declaration.module === 'SwiftUICore' &&
          declaration.owner === 'SwiftUICore.VisualEffect' && declaration.kind === 'func' &&
          ['opacity', 'scaleEffect'].includes(declaration.name) &&
          declaration.type === 'some SwiftUICore.VisualEffect' &&
          declaration.parameters.length >= 1 &&
          declaration.parameters[0].defaultValue === undefined &&
          ['Swift.Double', 'CoreFoundation.CGFloat'].includes(declaration.parameters[0].type) &&
          declaration.parameters.slice(1).every((parameter) => parameter.defaultValue !== undefined) &&
          present(declaration) && ios(declaration) <= ceiling)
          .map((declaration) => ({ name: declaration.name, ios: ios(declaration) }))
        if (new Set(cases.map((item) => item.name)).size === 2)
          return [{ name, module: method.module, kind: 'visualEffect', type: visualClosure!.type,
            cases, ios: ios(method),
            ...(visualInput === 'SwiftUI.ScrollTransitionPhase' ? { visualPhase: true as const } : {}),
            ...framework }]
      }
      const optionSet = method.parameters.length === 1 &&
        /^\(\(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) async -> Swift\.Set<([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)>\)\?$/.exec(method.parameters[0].type)
      if (optionSet) {
        const optionType = optionSet[2]
        const options = inventory.filter((declaration) => declaration.module === optionType.split('.')[0] &&
          declaration.owner === optionType && declaration.kind === 'func' && declaration.isStatic &&
          declaration.type === optionType && declaration.parameters.length === 1 &&
          ['Swift.Int', 'Swift.Bool', 'Swift.String'].includes(declaration.parameters[0].type) &&
          present(declaration) && ios(declaration) <= ios(method))
        if (options.length && new Set(options.map((declaration) => declaration.name)).size === options.length)
          return [{ name, module: method.module, kind: 'optionSet', type: method.parameters[0].type,
            resultType: optionType, ios: ios(method), ...framework,
            arguments: options.map((declaration) => ({ field: declaration.name,
              label: declaration.parameters[0].label, type: declaration.parameters[0].type,
              kind: declaration.parameters[0].type === 'Swift.Int' ? 'number' as const :
                declaration.parameters[0].type === 'Swift.Bool' ? 'boolean' as const : 'string' as const,
              optional: true })) }]
      }
      const caseSet = method.parameters.length === 1 &&
        /^Swift\.Set<([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)>$/.exec(method.parameters[0].type)
      if (caseSet) {
        const valueType = caseSet[1]
        const owner = valueType.split('.').slice(1).join('.')
        const cases = inventory.filter((declaration) =>
          declaration.module === valueType.split('.')[0] &&
          (declaration.owner === owner || declaration.owner === valueType) &&
          declaration.kind === 'static' && declaration.type === valueType &&
          declaration.parameters.length === 0 && /^[a-z]/.test(declaration.name) &&
          present(declaration) && ios(declaration) <= ios(method))
          .map((declaration) => ({ name: declaration.name, ios: ios(declaration) }))
        if (cases.length && new Set(cases.map((item) => item.name)).size === cases.length)
          return [{ name, module: method.module, kind: 'caseSet', type: method.parameters[0].type,
            resultType: valueType, label: method.parameters[0].label, cases,
            ios: ios(method), ...framework }]
      }
      const eligibleSelection = method.parameters.length === 1 &&
        /^@escaping \((?:_ [A-Za-z_]\w*: )?[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+, (?:_ [A-Za-z_]\w*: )?[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+, (?:_ [A-Za-z_]\w*: )?\[([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\]\) -> \1\?$/.exec(method.parameters[0].type)
      if (eligibleSelection && inventory.some((declaration) =>
        declaration.module === eligibleSelection[1].split('.')[0] &&
        declaration.owner === eligibleSelection[1] && declaration.kind === 'var' &&
        declaration.name === 'id' && ['Swift.String', 'Swift.String?'].includes(declaration.type ?? '') &&
        present(declaration) && ios(declaration) <= ios(method)))
        return [{ name, module: method.module, kind: 'selectionID', type: method.parameters[0].type,
          label: method.parameters[0].label, ios: ios(method), ...framework }]
      const arraySelection = method.parameters.length === 1 &&
        /^@escaping \((?:_ [A-Za-z_]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+), (?:_ [A-Za-z_]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> ([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\?$/.exec(method.parameters[0].type)
      if (arraySelection) {
        const resolveAlias = (type: string) => {
          const alias = inventory.filter((declaration) => declaration.kind === 'typealias' &&
            type.startsWith(`${declaration.module}.${declaration.name}`) &&
            (type.length === `${declaration.module}.${declaration.name}`.length ||
              type[`${declaration.module}.${declaration.name}`.length] === '.') &&
            declaration.owner === '' && declaration.type && present(declaration) && ios(declaration) <= ceiling)
            .sort((a, b) => b.name.length - a.name.length)[0]
          return alias ? `${alias.type}${type.slice(`${alias.module}.${alias.name}`.length)}` : type
        }
        const owner = resolveAlias(arraySelection[2])
        const result = resolveAlias(arraySelection[3])
        const members = inventory.filter((declaration) => declaration.kind === 'var' &&
          declaration.module === owner.split('.')[0] && declaration.owner === owner &&
          declaration.type === `[${result}]` && present(declaration) && ios(declaration) <= ceiling)
        if (members.length === 1)
          return [{ name, module: method.module, kind: 'selectionIndex',
            type: method.parameters[0].type, label: method.parameters[0].label,
            selectionMember: members[0].name, ios: Math.max(ios(method), ios(members[0])), ...framework }]
      }
      const defaultedCase = method.parameters.length > 1 &&
        method.parameters.every((parameter) => parameter.defaultValue !== undefined) &&
        valueOf(method.parameters[0].type)
      if (defaultedCase?.kind === 'enum' && defaultedCase.cases)
        return [{ name, module: method.module, kind: 'string',
          type: method.parameters[0].type, cases: defaultedCase.cases, ios: ios(method),
          ...(method.parameters[0].label === '_' ? {} : { label: method.parameters[0].label }),
          ...framework }]
      if (method.parameters.length === 0 ||
        (method.parameters.every((parameter) => parameter.defaultValue !== undefined && !parameter.type.includes('->')) &&
          method.parameters.every((parameter) => !valueOf(parameter.type))))
        return [
          {
            name,
            module: method.module,
            kind: 'boolean',
            type: '',
            ios: ios(method),
            zeroArgument: true,
            ...framework,
          },
        ]
      if (method.parameters.length === 1) {
        const input = /^@escaping \(inout ([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> Swift\.Void$/.exec(method.parameters[0].type)?.[1]
        if (input) {
          const [module, ...parts] = input.split('.')
          const owner = parts.join('.')
          if (inventory.some((declaration) => declaration.module === module &&
            declaration.kind === 'struct' && declaration.owner === parts.slice(0, -1).join('.') &&
            declaration.name === parts.at(-1) && !declaration.generic &&
            present(declaration) && ios(declaration) <= ceiling)) {
            const fields = inventory.filter((declaration) => declaration.module === module &&
              (declaration.owner === owner || declaration.owner === input) &&
              declaration.kind === 'var' && declaration.writable &&
              declaration.type === 'Swift.Bool' && /^[a-z]/.test(declaration.name) &&
              present(declaration) && ios(declaration) <= ceiling)
              .map((declaration) => ({ name: declaration.name, label: declaration.name,
                type: declaration.type!, ios: ios(declaration) }))
            if (fields.length) return [{ name, module: method.module, kind: 'record', type: '',
              ios: ios(method), arguments: [{ field: method.parameters[0].name,
                label: method.parameters[0].label, type: method.parameters[0].type,
                kind: 'structUpdate', optional: false, fields }], ...framework }]
          }
        }
      }
      const predicateInput = method.parameters.length === 1 &&
        /^@escaping \(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> Swift\.Bool$/.exec(method.parameters[0].type)?.[1]
      if (predicateInput)
        return [{ name, module: method.module, kind: 'boolean', type: method.parameters[0].type,
          predicateInput, ios: ios(method), ...framework,
          ...(method.parameters[0].label === '_' ? {} : { label: method.parameters[0].label }) }]
      const predicateValue = method.parameters.length === 1 &&
        /^Foundation\.Predicate<([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)>$/.exec(method.parameters[0].type)?.[1]
      if (predicateValue)
        return [{ name, module: method.module, kind: 'boolean', type: method.parameters[0].type,
          predicateInput: predicateValue, ios: ios(method), ...framework,
          ...(method.parameters[0].label === '_' ? {} : { label: method.parameters[0].label }) }]
      if (method.parameters.length === 1 &&
        (method.parameters[0].type === '@escaping () -> Foundation.NSItemProvider' ||
          method.parameters[0].type === 'Swift.Optional<() -> Foundation.NSItemProvider?>'))
        return [{ name, module: method.module, kind: 'string', type: method.parameters[0].type,
          swiftExpression: '{ Foundation.NSItemProvider(object: $value as NSString) }',
          ios: ios(method), ...framework,
          ...(method.parameters[0].label === '_' ? {} : { label: method.parameters[0].label }) }]
      const resultCallback = method.parameters.filter((parameter) =>
        /^@escaping \(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> ([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)$/.test(parameter.type))
      if (resultCallback.length === 1 && method.parameters.every((parameter) =>
        parameter === resultCallback[0] || parameter.defaultValue !== undefined)) {
        const [, inputType, resultType] = /^@escaping \(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> ([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)$/.exec(resultCallback[0].type)!
        const input = eventValueOf(inputType, ios(method))
        const casesOf = (enumType: string) => {
          const [module, ...parts] = enumType.split('.')
          const owner = parts.join('.')
          if (!inventory.some((d) => d.module === module && d.kind === 'enum' &&
            (d.owner === parts.slice(0, -1).join('.') ||
              d.owner === [module, ...parts.slice(0, -1)].join('.')) && d.name === parts.at(-1) &&
            present(d) && ios(d) <= ceiling)) return
          const cases = inventory.filter((d) => d.module === module &&
            (d.owner === owner || d.owner === enumType) && d.enumCase &&
            d.parameters.length === 0 && present(d) && ios(d) <= ceiling)
            .map((d) => ({ name: d.name, ios: ios(d) }))
          return cases.length && new Set(cases.map((item) => item.name)).size === cases.length
            ? cases : undefined
        }
        let cases = casesOf(resultType)
        let resultConstructor: DerivedModifier['resultConstructor']
        if (!cases) {
          const [module, ...parts] = resultType.split('.')
          const owner = parts.join('.')
          if (inventory.some((d) => d.module === module && d.kind === 'struct' &&
            d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
            present(d) && ios(d) <= ceiling)) {
            const constructors = inventory.filter((d) => d.module === module &&
              (d.owner === owner || d.owner === resultType) && d.kind === 'init' &&
              d.parameters.length === 1 && present(d) && ios(d) <= ceiling &&
              casesOf(d.parameters[0].type))
            if (constructors.length === 1) {
              resultConstructor = { type: constructors[0].parameters[0].type,
                label: constructors[0].parameters[0].label }
              cases = casesOf(resultConstructor.type)
            }
          }
        }
        if (input && cases)
          return [{ name, module: method.module, kind: 'eventReturnEnum',
            type: resultCallback[0].type, label: resultCallback[0].label,
            eventInputType: inputType, eventValue: input, resultType,
            ...(resultConstructor ? { resultConstructor } : {}),
            cases, ios: ios(method), ...framework }]
      }
      const codableBinding = (type: string) => {
        const valueType = /^SwiftUICore\.Binding<([A-Za-z_]\w*\.[A-Za-z][\w.]*)>\??$/.exec(type)?.[1]
        if (!valueType) return
        const [valueModule, ...parts] = valueType.split('.')
        return inventory.some((d) => d.module === valueModule && d.kind === 'struct' &&
          d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
          d.inheritedTypes?.includes('Swift.Codable') && present(d) && ios(d) <= ceiling)
          ? valueType : undefined
      }
      const pointBinding = (type: string) => {
        const valueType = /^SwiftUICore\.Binding<([A-Za-z_]\w*\.[A-Za-z][\w.]*)>$/.exec(type)?.[1]
        if (!valueType) return
        const [module, ...parts] = valueType.split('.')
        const owner = parts.join('.')
        const declarations = inventory.filter((d) => d.module === module &&
          (d.owner === owner || d.owner === valueType) && present(d) && ios(d) <= ceiling)
        const constructor = declarations.filter((d) => d.kind === 'init' &&
          d.parameters.some((parameter) => parameter.label === 'point' && parameter.type === 'CoreFoundation.CGPoint') &&
          d.parameters.every((parameter) => parameter.label === 'point' || parameter.defaultValue !== undefined))
        return inventory.some((d) => d.module === module && d.kind === 'struct' &&
          d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
          !d.generic && present(d) && ios(d) <= ceiling) &&
          constructor.length === 1 &&
          declarations.some((d) => d.kind === 'init' && d.parameters.every((parameter) => parameter.defaultValue !== undefined)) &&
          declarations.some((d) => d.kind === 'var' && d.name === 'point' && d.type === 'CoreFoundation.CGPoint?')
          ? valueType : undefined
      }
      const bridged = method.parameters.filter((p) => eventOrBindingType(p.type) || p.type === 'SwiftUICore.Binding<(some Hashable)?>' || focusBindingType.test(p.type) || codableBinding(p.type) || pointBinding(p.type) || enumCallbackOf(p.type) || associatedCallbackOf(p.type, ios(method)) || structCallbackOf(p.type, ios(method)))
      if (bridged.length === 1 && method.parameters.every((p) => p === bridged[0] || p.defaultValue !== undefined)) {
        const parameter = bridged[0]
        const callbackValue = scalarCallbackType.exec(parameter.type)?.[1]
        const enumCallback = enumCallbackOf(parameter.type)
        const associatedCallback = associatedCallbackOf(parameter.type, ios(method))
        const structCallback = structCallbackOf(parameter.type, ios(method))
        const codableType = codableBinding(parameter.type)
        const pointType = pointBinding(parameter.type)
        const kind = associatedCallback
          ? 'eventAssociatedEnum'
          : structCallback
            ? 'eventStruct'
          : enumCallback
          ? enumCallback.pair ? 'eventEnumPair' : 'eventEnum'
          : focusBindingType.test(parameter.type)
          ? 'bindingFocusBoolean'
          : codableType
          ? 'bindingCodable'
          : pointType
          ? 'bindingPoint'
          : parameter.type.includes('Binding<Swift.Bool>')
          ? 'bindingBoolean'
          : parameter.type.includes('Binding<Swift.String>')
            ? 'bindingString'
            : parameter.type === 'SwiftUICore.Binding<(some Hashable)?>' ||
              parameter.type === 'SwiftUICore.Binding<Foundation.URL?>'
              ? 'bindingOptionalString'
            : callbackValue === 'Swift.Bool'
              ? 'eventBoolean'
              : callbackValue === 'Swift.String' || callbackValue === 'Foundation.URL'
                ? 'eventString'
                : callbackValue
                  ? 'eventNumber'
                  : 'event'
        return [{
          name, module: method.module, kind, type: parameter.type, label: parameter.label, ios: ios(method), ...framework,
          ...(codableType ? {
            bindingType: codableType,
            ...(inventory.some((d) => d.module === codableType.split('.')[0] &&
              (d.owner === codableType.split('.').slice(1).join('.') || d.owner === codableType) &&
              d.kind === 'init' && d.parameters.length === 0 && present(d) && ios(d) <= ceiling)
              ? { bindingDefault: true as const } : {}),
          } : {}),
          ...(pointType ? { bindingType: pointType } : {}),
          ...(enumCallback ? { cases: enumCallback.cases } : {}),
          ...(associatedCallback ? { associatedCases: associatedCallback } : {}),
          ...(structCallback ? { eventValue: structCallback } : {}),
          ...(method.parameters.length > 1 ? {
            callArguments: method.parameters.map((p) =>
              p === parameter ? { label: p.label, bridge: true as const } : { label: p.label, defaultValue: p.defaultValue }
            ),
          } : {}),
        }]
      }
      if (method.parameters.length > 1) {
        const [first, callback] = method.parameters
        const constantNumber = method.parameters.length === 2 &&
          /^@escaping (?:@Sendable )?\(([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> (CoreFoundation\.CGFloat|Swift\.(?:Double|Float|Int))$/.exec(callback.type)
        const firstValue = constantNumber && valueOf(first.type)
        if (firstValue && constantNumber)
          return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
            aliasSuffix: first.type.split('.').at(-1),
            arguments: [
              { ...firstValue, field: first.name, label: first.label },
              { field: callback.name, label: callback.label, type: constantNumber[2],
                sdkType: callback.type, kind: 'number', optional: false,
                closureInput: constantNumber[1] },
            ], ...framework }]
        const preferNumeric = method.parameters.some((parameter) => valueOf(parameter.type)?.kind === 'numericTuple')
        const bridgeArguments = (parameters: Declaration['parameters']) => parameters.map((parameter, index) => {
          const resultURL = urlResultOf(parameter.type)
          const classUpdate = parameter.name === 'update' && classUpdateOf(parameter.type, ios(method))
          const eventValue = parameter.name === 'update' ? undefined : structCallbackOf(parameter.type, ios(method))
          const value = resultURL
            ? { kind: resultURL.startsWith('[') ? 'resultURLArray' as const : 'resultURL' as const,
                type: parameter.type, optional: false }
            : classUpdate
              ? { kind: 'classUpdate' as const, type: parameter.type, optional: false,
                fields: classUpdate.fields }
            : eventValue
              ? { kind: 'eventStruct' as const, type: parameter.type, optional: false,
                eventValue }
            : parameter.type === 'SwiftUICore.Binding<Swift.Bool>'
            ? { kind: 'bindingBoolean' as const, type: parameter.type, optional: false }
            : parameter.type === 'SwiftUICore.Binding<Foundation.URL?>'
              ? { kind: 'bindingOptionalURL' as const, type: parameter.type, optional: false }
            : valueOf(parameter.type, preferNumeric)
          return value && { ...value, field: parameter.name || `argument${index + 1}`, label: parameter.label }
        })
        let argumentsFromSDK = bridgeArguments(method.parameters)
        if (argumentsFromSDK.some((argument) => !argument))
          argumentsFromSDK = bridgeArguments(method.parameters.filter((parameter) => parameter.defaultValue === undefined))
        if (argumentsFromSDK.length === 0 || argumentsFromSDK.some((argument) => !argument)) return []
        const args = argumentsFromSDK as DerivedArgument[]
        if (new Set(args.map((argument) => argument.field)).size !== args.length) return []
        return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method), arguments: args, ...framework }]
      }
      const { type, label } = method.parameters[0]
      const opaqueProtocol = /^some ((?:[A-Za-z_]\w*\.)?[A-Za-z]\w*)$/.exec(type)?.[1]
      if (opaqueProtocol) {
        const owners = [...new Set(inventory.filter((declaration) =>
          declaration.kind === 'static' && declaration.owner.split('.').at(-1) === opaqueProtocol &&
          present(declaration) && ios(declaration) <= ceiling).map((declaration) => declaration.owner))]
        const cases = styleCases(opaqueProtocol.includes('.') ? opaqueProtocol : `${method.module}.${opaqueProtocol}`) ??
          (owners.length === 1 ? styleCases(owners[0]) : undefined)
        if (cases) return [{ name, module: method.module, kind: 'style', type, ios: ios(method), cases, ...framework,
          ...(label === '_' ? {} : { label }) }]
      }
      const value = valueOf(type)
      if (!value && /^[A-Za-z_]\w*\.[A-Za-z]\w*\??$/.test(type)) {
        const baseType = type.replace(/\?$/, '')
        const [module, owner] = baseType.split('.')
        if (inventory.some((declaration) => declaration.module === module && declaration.owner === '' &&
          declaration.kind === 'struct' && declaration.name === owner &&
          declaration.inheritedTypes?.includes('Swift.RawRepresentable') && present(declaration) && ios(declaration) <= ceiling) &&
          inventory.some((declaration) => declaration.module === module && declaration.owner === owner &&
            declaration.kind === 'init' && declaration.parameters.length === 1 &&
            declaration.parameters[0].label === 'rawValue' && declaration.parameters[0].type === 'Swift.String' &&
            present(declaration) && ios(declaration) <= ceiling))
          return [{ name, module: method.module, kind: type.endsWith('?') ? 'optionalString' : 'string',
            type, rawString: true, ios: ios(method), ...framework, ...(label === '_' ? {} : { label }) }]
      }
      if (!value || value.kind === 'stringArray' || value.kind === 'stringSet') return []
      if (value.kind === 'numericStruct' || value.kind === 'numericTuple')
        return [{ name, module: method.module, kind: 'record', type: '', ios: ios(method),
          arguments: [{ ...value, field: method.parameters[0].name || 'value', label }], ...framework }]
      const kind = value.kind === 'enum'
        ? value.optional ? 'optionalEnum' : 'string'
        : value.kind === 'url'
          ? value.optional ? 'optionalURL' : 'url'
        : value.optional
          ? `optional${value.kind[0].toUpperCase()}${value.kind.slice(1)}` as DerivedModifier['kind']
          : value.kind
      return [{ name, module: method.module, kind, type, ios: ios(method), ...framework,
        ...(value.scalarConstructor ? { scalarConstructor: value.scalarConstructor } : {}),
        ...(value.swiftExpression ? { swiftExpression: value.swiftExpression } : {}),
        ...(value.cases ? { cases: value.cases } : {}), ...(label === '_' ? {} : { label }) }]
    })
    if (candidates.some((candidate) => candidate.transformMember)) {
      result.push(...candidates.filter((candidate) => candidate.transformMember))
      continue
    }
    const unique = candidates.filter((candidate, index) => !candidate.kind.startsWith('event') ||
      !candidates.some((other, otherIndex) => otherIndex !== index && other.kind === candidate.kind &&
        other.module === candidate.module && other.type === candidate.type && other.label === candidate.label &&
        (other.ios < candidate.ios || (other.ios === candidate.ios && otherIndex < index))))
    const establishedValues = unique.filter((candidate) => candidate.kind !== 'bindingFocusBoolean' &&
      (candidate.kind !== 'record' ||
        !candidate.arguments?.some((argument) => argument.kind === 'numericStruct' || argument.kind === 'numericTuple')))
    const valueCandidates = establishedValues.length ? establishedValues : unique
    const concrete = valueCandidates.filter((candidate) => !candidate.type.startsWith('some '))
    const preferred = concrete.length ? concrete : valueCandidates
    const established = preferred.filter((candidate) =>
      candidate.kind !== 'record' || !candidate.arguments?.some((argument) => argument.sdkType))
    const selected = established.length ? established : preferred
    if (selected.length === 1 && !reservedNames.has(name) && !selected[0].aliasSuffix) {
      const { module, ...modifier } = selected[0]
      result.push(modifier)
      continue
    }
    const baseBinding = selected.filter((candidate) => candidate.kind === 'bindingBoolean')
    const keepBaseBinding = baseBinding.length === 1 && selected.some((candidate) => candidate.kind === 'record')
      ? baseBinding[0] : undefined
    const baseEvent = selected.filter((candidate) => candidate.kind === 'event')
    const keepBaseEvent = baseEvent.length === 1 && selected.some((candidate) =>
      candidate.kind === 'eventStruct' && candidate.module === baseEvent[0].module)
      ? baseEvent[0] : undefined
    const baseStruct = selected.filter((candidate) => candidate.kind === 'eventStruct')
    const keepBaseStruct = baseStruct.length === 1 && selected.some((candidate) =>
      candidate.kind === 'record' && candidate.module === baseStruct[0].module)
      ? baseStruct[0] : undefined
    const keepBase = keepBaseBinding ?? keepBaseEvent ?? keepBaseStruct
    if (keepBase) {
      const { module, ...modifier } = keepBase
      result.push(modifier)
    }
    for (const candidate of selected.filter((item) => item !== keepBase).sort((a, b) =>
      `${a.module}|${a.label}|${a.type}`.localeCompare(`${b.module}|${b.label}|${b.type}`)
    )) {
      const typeName = candidate.type.replace(/\?$/, '').split('.').at(-1)?.replace(/[^A-Za-z0-9]/g, '') ?? 'Value'
      const suffix = candidate.aliasSuffix ?? (candidate.label && candidate.label !== '_'
        ? candidate.label[0].toUpperCase() + candidate.label.slice(1)
        : candidate.zeroArgument
          ? 'NoArguments'
          : candidate.kind === 'record'
            ? candidate.arguments?.map((argument) => argument.field[0].toUpperCase() + argument.field.slice(1)).join('And') ?? 'Arguments'
          : candidate.kind.startsWith('event')
            ? `Event${candidate.kind.slice('event'.length) || 'Action'}`
            : candidate.kind.startsWith('binding')
              ? `Binding${candidate.kind.slice('binding'.length)}`
              : `${candidate.type.endsWith('?') ? 'Optional' : ''}${typeName}`)
      let alias = `${name}With${suffix}`
      if (publicNames.has(alias)) alias += `From${candidate.module?.replace(/[^A-Za-z0-9]/g, '')}`
      while (publicNames.has(alias)) alias += 'Variant'
      publicNames.add(alias)
      result.push({ ...candidate, name: alias, sdkName: name })
    }
  }
  for (const method of methods.filter((method) => method.parameters.length === 2 &&
    method.parameters[0].label === 'containerItemID' &&
    method.parameters[0].type === 'ItemID' &&
    method.parameters[1].label === 'containerNamespace' &&
    method.parameters[1].type === 'SwiftUICore.Namespace.ID?' &&
    method.parameters[1].defaultValue !== undefined &&
    method.requirements?.includes('ItemID : Swift.Hashable') &&
    method.requirements.includes('ItemID : Swift.Sendable')))
    result.push({ name: `${method.name}WithContainerItemID`, sdkName: method.name,
      kind: 'dragItemID', type: 'ItemID', ios: ios(method) })
  for (const method of methods.filter((method) => method.module === 'SwiftUI' &&
    method.parameters.length === 1 &&
    method.parameters[0].type === 'some UIGestureRecognizerRepresentable'))
    result.push({ name: `${method.name}WithUITapRecognizer`, sdkName: method.name,
      kind: 'event', type: method.parameters[0].type, ios: ios(method), uiRecognizer: true })
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

// parameterless public View structs have no binding, closure, conversion, or
// child-slot contract to invent. the existing leaf emitter supplies their host.
export function deriveViews(
  inventory: readonly Declaration[],
  floor: number,
  existingNames: ReadonlySet<string>
): Control[] {
  return inventory
    .filter(
      (d) =>
        d.kind === 'struct' &&
        (d.module === 'SwiftUI' || d.module === 'SwiftUICore' ||
          /^_[A-Za-z]+_SwiftUI$/.test(d.module)) &&
        d.owner === '' &&
        !d.generic &&
        /^[A-Z]/.test(d.name) &&
        !d.name.startsWith('Default') &&
        d.inheritedTypes?.some(
          (type) => type === 'SwiftUICore.View' || type === 'SwiftUI.View'
        ) &&
        present(d) &&
        ios(d) <= floor &&
        !existingNames.has(d.name)
    )
    .flatMap((view): Control[] => {
      const constructors = inventory.filter(
        (d) =>
          d.kind === 'init' &&
          d.module === view.module &&
          d.owner === view.name &&
          d.parameters.length === 0 &&
          present(d) &&
          ios(d) <= floor
      )
      if (constructors.length !== 1) return []
      return [
        {
          name: view.name,
          fields: {},
          constructors: [{ type: view.name, parameters: [] }],
          swift: `${view.name}()`,
          validate: '',
        },
      ]
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
