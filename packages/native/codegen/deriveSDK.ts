import { ios, present, type Declaration } from './inventory'
import type { Control } from './controlTypes'

const emptyEventOrBindingType = /^(?:@escaping )?\(\) -> Swift\.Void\??$|^\(\(\) -> (?:Swift\.Void|\(\))\)\?$|^SwiftUICore\.Binding<Swift\.(?:Bool|String)>$/
const scalarCallbackType = /^(?:@escaping )?\((?:_ [A-Za-z]\w*: )?(Swift\.(?:Bool|String|Int|Float|Double)|CoreFoundation\.CGFloat|Foundation\.URL)\) -> (?:Swift\.Void|\(\))$/
const eventOrBindingType = (type: string) => emptyEventOrBindingType.test(type) || scalarCallbackType.test(type)
const focusBindingType = /^SwiftUI\.(?:Accessibility)?FocusState<Swift\.Bool>\.Binding$/

export type DerivedArgument = {
  field: string
  label: string
  type: string
  sdkType?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'enum' | 'stringArray' | 'stringSet' | 'numericStruct' | 'numericTuple'
  optional: boolean
  cases?: readonly { name: string; ios: number }[]
  fields?: readonly { name: string; label: string; type: string }[]
  wrappedType?: string
}

export type EventValueSchema =
  | { kind: 'number' | 'string' | 'boolean' | 'point' }
  | { kind: 'enum'; cases: readonly string[] }
  | { kind: 'optional'; value: EventValueSchema }
  | { kind: 'object'; fields: readonly { name: string; value: EventValueSchema }[] }

export type DerivedModifier = {
  name: string
  sdkName?: string
  module?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'optionalBoolean' | 'optionalNumber' | 'optionalString' | 'optionalURL' | 'optionalEnum' | 'record' | 'style' | 'event' | 'eventBoolean' | 'eventNumber' | 'eventString' | 'eventEnum' | 'eventEnumPair' | 'eventAssociatedEnum' | 'eventStruct' | 'eventValueString' | 'bindingBoolean' | 'bindingString' | 'bindingOptionalString' | 'bindingFocusBoolean'
  ios: number
  type: string
  rawString?: true
  cases?: readonly { name: string; ios: number }[]
  associatedCases?: readonly { name: string; values: readonly EventValueSchema[] }[]
  eventValue?: EventValueSchema
  zeroArgument?: true
  framework?: string
  label?: string
  callbackLabel?: string
  callArguments?: readonly { label: string; defaultValue?: string; bridge?: true }[]
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
    if (baseType === '[Swift.String]' || baseType === '[SwiftUICore.Text]')
      return { kind: 'stringArray', type, optional }
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
    let numericStruct: Omit<DerivedArgument, 'field' | 'label'> | undefined
    const publicStruct = inventory.some((d) => d.module === module && d.kind === 'struct' &&
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
        d.module === module &&
        (d.owner === owner.join('.') || d.owner === baseType) &&
        d.kind === 'static' && d.parameters.length === 0 &&
        (d.type?.replace('?', '') === owner.join('.') || d.type?.replace('?', '') === baseType ||
          d.type?.replace('?', '') === owner.at(-1)) &&
        /^[A-Za-z]/.test(d.name) && present(d) && ios(d) <= ceiling
      )
      .map((d) => ({ name: d.name, ios: ios(d) }))
    if (preferNumeric && numericStruct && cases.length < 2) return numericStruct
    if (!cases.length || new Set(cases.map((item) => item.name)).size !== cases.length) return numericStruct
    return { kind: 'enum', type, optional, cases }
  }
}

export type DerivedSlotArgument = DerivedArgument | { field: string; label: string; type: string; kind: 'bindingBoolean' | 'bindingString'; optional: false }
export type DerivedViewSlot = { name: string; sdkName?: string; module: string; label: string; ios: number; directValue?: true; arguments: readonly DerivedSlotArgument[] }

export function deriveViewSlots(inventory: readonly Declaration[], ceiling: number): DerivedViewSlot[] {
  const valueOf = bridgeValueOf(inventory, ceiling)
  const isContent = (d: Declaration, parameter: Declaration['parameters'][number]) => {
    if (parameter.type === '() -> some View') return true
    const generic = /^\(\) -> ([A-Za-z_]\w*)$|^([A-Za-z_]\w*)\??$/.exec(parameter.type)
    return Boolean(generic && d.requirements?.includes(`${generic[1] ?? generic[2]} : SwiftUICore.View`))
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
      d.owner.split('.').at(-1) === 'View' && builders.length === 1 &&
      d.parameters.at(-1) === builders[0] &&
      d.parameters.every((parameter) => parameter === builders[0] || parameter.defaultValue !== undefined ||
        ['enum', 'string', 'boolean'].includes(valueOf(parameter.type)?.kind ?? '') ||
        parameter.type === 'SwiftUICore.Binding<Swift.Bool>' ||
        isStringBinding(d, parameter.type)) &&
      present(d) && ios(d) <= ceiling
    )
  }).filter((slot, _, candidates) =>
    slot.parameters.at(-1)!.type.startsWith('() ->') ||
    !candidates.some((other) => other.module === slot.module && other.name === slot.name &&
      other.parameters.at(-1)!.type.startsWith('() ->')))
  const byName = new Map<string, Declaration[]>()
  for (const slot of slots) {
    const key = `${slot.module}.${slot.name}`
    byName.set(key, [...(byName.get(key) ?? []), slot])
  }
  return [...byName].flatMap(([, declarations]) => declarations.map((slot) => {
    const content = slot.parameters.at(-1)!
    const directValue = !content.type.startsWith('() ->')
    const required = slot.parameters.filter((parameter) =>
      parameter !== content && parameter.defaultValue === undefined)
    const suffix = declarations.length === 1 || required.length === 0 ? ''
      : `With${required.map((parameter) => isStringBinding(slot, parameter.type)
        ? 'BindingString' : parameter.type.split('.').at(-1)!.replace(/[^A-Za-z0-9]/g, '')).join('And')}`
    const directSuffix = declarations.length > 1 && directValue
      ? `With${content.label === '_' ? content.type.replace(/\?$/, '') : content.label[0].toUpperCase() + content.label.slice(1)}`
      : suffix
    return { name: `${slot.name}${directSuffix}`, ...(directSuffix ? { sdkName: slot.name } : {}), module: slot.module,
      label: content.label, ios: ios(slot), ...(directValue ? { directValue: true as const } : {}),
      arguments: slot.parameters.filter((parameter) =>
        parameter !== content && parameter.defaultValue === undefined)
        .map((parameter) => parameter.type === 'SwiftUICore.Binding<Swift.Bool>' || isStringBinding(slot, parameter.type)
          ? { field: parameter.name, label: parameter.label, type: parameter.type, kind: parameter.type === 'SwiftUICore.Binding<Swift.Bool>' ? 'bindingBoolean' as const : 'bindingString' as const, optional: false as const }
          : { ...valueOf(parameter.type)!, field: parameter.name, label: parameter.label }) }
  }))
    .sort((a, b) => a.name.localeCompare(b.name))
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
  const eventValueOf = (type: string, version: number, seen = new Set<string>()): EventValueSchema | undefined => {
    if (type.endsWith('?')) {
      const value = eventValueOf(type.slice(0, -1), version, seen)
      return value && { kind: 'optional', value }
    }
    if (['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat'].includes(type)) return { kind: 'number' }
    if (type === 'Swift.String') return { kind: 'string' }
    if (type === 'Swift.Bool') return { kind: 'boolean' }
    if (type === 'CoreFoundation.CGPoint') return { kind: 'point' }
    const [module, ...parts] = type.split('.')
    const owner = parts.join('.')
    if (inventory.some((d) => d.module === module && d.kind === 'enum' &&
      d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
      d.attributes.includes('@frozen') && present(d) && ios(d) <= version)) {
      const cases = inventory.filter((d) => d.module === module &&
        (d.owner === owner || d.owner === type) && d.enumCase && present(d) && ios(d) <= ceiling)
      if (cases.length && cases.every((item) => item.parameters.length === 0) &&
        new Set(cases.map((item) => item.name)).size === cases.length)
        return { kind: 'enum', cases: cases.map((item) => item.name) }
    }
    if (!owner || seen.has(type) || !inventory.some((d) => d.module === module && d.kind === 'struct' &&
      d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) && !d.generic && present(d) && ios(d) <= version)) return
    const fields = inventory.filter((d) => d.module === module && (d.owner === owner || d.owner === type) &&
      d.kind === 'var' && d.stored && present(d) && ios(d) <= version)
    if (!fields.length || new Set(fields.map((field) => field.name)).size !== fields.length) return
    const next = new Set([...seen, type])
    const mapped = fields.map((field) => ({ name: field.name, value: eventValueOf(field.type ?? '', version, next) }))
    return mapped.every((field) => field.value)
      ? { kind: 'object', fields: mapped as { name: string; value: EventValueSchema }[] }
      : undefined
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
    const baseType = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> Swift\.Void$/.exec(type)?.[1]
    const value = baseType && eventValueOf(baseType, version)
    return value?.kind === 'object' || value?.kind === 'point' ? value : undefined
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
      !reservedNames.has(d.name)
  )
  const byName = new Map<string, Declaration[]>()
  for (const method of methods)
    byName.set(method.name, [...(byName.get(method.name) ?? []), method])
  const result: DerivedModifier[] = []
  const publicNames = new Set([...reservedNames, ...byName.keys()])
  for (const [name, overloads] of byName) {
    const candidates = overloads.flatMap((method): DerivedModifier[] => {
      const framework = method.module.startsWith('_')
        ? { framework: method.module.slice(1, -'_SwiftUI'.length) }
        : {}
      if (method.requirements?.length) {
        if (method.requirements.length !== 1) return []
        const style = /^S : ([A-Za-z_]\w*\.[A-Za-z][\w.]*)$/.exec(method.requirements[0])?.[1]
        if (style && method.parameters.length === 1 && method.parameters[0].type === 'S') {
          const cases = styleCases(style)
          if (!cases) return []
          return [{ name, module: method.module, kind: 'style', type: 'S', ios: ios(method), cases, ...framework }]
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
        return []
      }
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
      const bridged = method.parameters.filter((p) => eventOrBindingType(p.type) || p.type === 'SwiftUICore.Binding<(some Hashable)?>' || focusBindingType.test(p.type) || enumCallbackOf(p.type) || associatedCallbackOf(p.type, ios(method)) || structCallbackOf(p.type, ios(method)))
      if (bridged.length === 1 && method.parameters.every((p) => p === bridged[0] || p.defaultValue !== undefined)) {
        const parameter = bridged[0]
        const callbackValue = scalarCallbackType.exec(parameter.type)?.[1]
        const enumCallback = enumCallbackOf(parameter.type)
        const associatedCallback = associatedCallbackOf(parameter.type, ios(method))
        const structCallback = structCallbackOf(parameter.type, ios(method))
        const kind = associatedCallback
          ? 'eventAssociatedEnum'
          : structCallback
            ? 'eventStruct'
          : enumCallback
          ? enumCallback.pair ? 'eventEnumPair' : 'eventEnum'
          : focusBindingType.test(parameter.type)
          ? 'bindingFocusBoolean'
          : parameter.type.includes('Binding<Swift.Bool>')
          ? 'bindingBoolean'
          : parameter.type.includes('Binding<Swift.String>')
            ? 'bindingString'
            : parameter.type === 'SwiftUICore.Binding<(some Hashable)?>'
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
        const preferNumeric = method.parameters.some((parameter) => valueOf(parameter.type)?.kind === 'numericTuple')
        const bridgeArguments = (parameters: Declaration['parameters']) => parameters.map((parameter, index) => {
          const value = valueOf(parameter.type, preferNumeric)
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
        const cases = styleCases(opaqueProtocol.includes('.') ? opaqueProtocol : `${method.module}.${opaqueProtocol}`)
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
        ...(value.cases ? { cases: value.cases } : {}), ...(label === '_' ? {} : { label }) }]
    })
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
    if (selected.length === 1) {
      const { module, ...modifier } = selected[0]
      result.push(modifier)
      continue
    }
    for (const candidate of selected.sort((a, b) =>
      `${a.module}|${a.label}|${a.type}`.localeCompare(`${b.module}|${b.label}|${b.type}`)
    )) {
      const typeName = candidate.type.replace(/\?$/, '').split('.').at(-1)?.replace(/[^A-Za-z0-9]/g, '') ?? 'Value'
      const suffix = candidate.label && candidate.label !== '_'
        ? candidate.label[0].toUpperCase() + candidate.label.slice(1)
        : candidate.zeroArgument
          ? 'NoArguments'
          : candidate.kind === 'record'
            ? candidate.arguments?.map((argument) => argument.field[0].toUpperCase() + argument.field.slice(1)).join('And') ?? 'Arguments'
          : candidate.kind.startsWith('event')
            ? `Event${candidate.kind.slice('event'.length) || 'Action'}`
            : candidate.kind.startsWith('binding')
              ? `Binding${candidate.kind.slice('binding'.length)}`
              : `${candidate.type.endsWith('?') ? 'Optional' : ''}${typeName}`
      let alias = `${name}With${suffix}`
      if (publicNames.has(alias)) alias += `From${candidate.module?.replace(/[^A-Za-z0-9]/g, '')}`
      while (publicNames.has(alias)) alias += 'Variant'
      publicNames.add(alias)
      result.push({ ...candidate, name: alias, sdkName: name })
    }
  }
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
