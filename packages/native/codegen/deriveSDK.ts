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
  kind: 'boolean' | 'number' | 'string' | 'url' | 'enum' | 'stringArray' | 'stringSet' | 'numericStruct' | 'numericTuple' | 'bindingBoolean' | 'bindingOptionalURL' | 'resultURL' | 'resultURLArray' | 'eventStruct' | 'classUpdate' | 'structUpdate'
  optional: boolean
  cases?: readonly { name: string; ios: number }[]
  fields?: readonly { name: string; label: string; type: string; ios?: number }[]
  wrappedType?: string
  scalarConstructor?: { label: string; type: string; failable?: boolean }
  swiftExpression?: string
  closureInput?: string
  eventValue?: EventValueSchema
}

export type EventValueSchema =
  | { kind: 'number' | 'string' | 'boolean' | 'point' | 'size' }
  | { kind: 'enum'; cases: readonly string[]; open?: true }
  | { kind: 'optional'; value: EventValueSchema }
  | { kind: 'array'; value: EventValueSchema }
  | { kind: 'object'; fields: readonly { name: string; value: EventValueSchema }[] }

export type DerivedModifier = {
  name: string
  sdkName?: string
  module?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'optionalBoolean' | 'optionalNumber' | 'optionalString' | 'optionalURL' | 'optionalEnum' | 'record' | 'style' | 'gesture' | 'defaultFocusBoolean' | 'event' | 'eventAsync' | 'eventBoolean' | 'eventNumber' | 'eventString' | 'eventEnum' | 'eventEnumPair' | 'eventAssociatedEnum' | 'eventStruct' | 'eventValueString' | 'eventReturnArray' | 'eventReturnEnum' | 'bindingBoolean' | 'bindingString' | 'bindingOptionalString' | 'bindingFocusBoolean' | 'bindingCodable' | 'bindingPoint'
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
  resultConstructor?: { type: string; label: string }
  eventPair?: true
  eventInputs?: readonly string[]
  gestureOptions?: readonly { name: string; type: string; ios: number; eventValue?: EventValueSchema }[]
  transformMember?: string
  environmentKey?: string
  zeroArgument?: true
  framework?: string
  label?: string
  callbackLabel?: string
  bindingType?: string
  bindingDefault?: true
  predicateInput?: string
  aliasSuffix?: string
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
export type DerivedViewSlot = { name: string; sdkName?: string; module: string; label: string; ios: number; directValue?: true; closureInputs?: readonly string[]; arguments: readonly DerivedSlotArgument[] }

export function deriveViewSlots(inventory: readonly Declaration[], ceiling: number): DerivedViewSlot[] {
  const valueOf = bridgeValueOf(inventory, ceiling)
  const closureInputsOf = (type: string) =>
    /^@escaping \(([^,<>()]+(?:, [^,<>()]+)*)\) -> some View$/.exec(type)?.[1].split(', ')
  const isContent = (d: Declaration, parameter: Declaration['parameters'][number]) => {
    if (parameter.type === '() -> some View') return true
    if (closureInputsOf(parameter.type)) return true
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
    const closureInputs = closureInputsOf(content.type)
    const directValue = !content.type.startsWith('() ->') && !closureInputs
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
      ...(closureInputs ? { closureInputs } : {}),
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
  const urlResultOf = (type: string) =>
    (/^@escaping \((?:_ [A-Za-z]\w*: )?Swift\.Result<(\[Foundation\.URL\]|Foundation\.URL), any Swift\.Error>\) -> Swift\.Void$/.exec(type) ??
      /^\(\(Swift\.Result<(\[Foundation\.URL\]|Foundation\.URL), any Swift\.Error>\) -> Swift\.Void\)\?$/.exec(type))?.[1]
  const eventValueOf = (type: string, version: number, seen = new Set<string>()): EventValueSchema | undefined => {
    if (type.endsWith('?')) {
      const value = eventValueOf(type.slice(0, -1), version, seen)
      return value && { kind: 'optional', value }
    }
    if (['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat'].includes(type)) return { kind: 'number' }
    if (type === 'Swift.String') return { kind: 'string' }
    if (type === 'Swift.Bool') return { kind: 'boolean' }
    if (type === 'CoreFoundation.CGPoint') return { kind: 'point' }
    if (type === 'CoreFoundation.CGSize') return { kind: 'size' }
    const [module, ...parts] = type.split('.')
    const owner = parts.join('.')
    const enumDeclaration = inventory.find((d) => d.module === module && d.kind === 'enum' &&
      d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) &&
      (d.attributes.includes('@frozen') || d.attributes.includes('@symbolgraph')) &&
      present(d) && ios(d) <= version)
    if (enumDeclaration) {
      const cases = inventory.filter((d) => d.module === module &&
        (d.owner === owner || d.owner === type) && d.enumCase && present(d) && ios(d) <= ceiling)
      if (cases.length && cases.every((item) => item.parameters.length === 0) &&
        new Set(cases.map((item) => item.name)).size === cases.length)
        return { kind: 'enum', cases: cases.map((item) => item.name),
          ...(enumDeclaration.attributes.includes('@symbolgraph') ? { open: true as const } : {}) }
    }
    if (!owner || seen.has(type) || !inventory.some((d) => d.module === module &&
      (d.kind === 'struct' || d.kind === 'class') &&
      d.owner === parts.slice(0, -1).join('.') && d.name === parts.at(-1) && !d.generic && present(d) && ios(d) <= version)) return
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
      !reservedNames.has(d.name)
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
    }
  }
  for (const [name, overloads] of byName) {
    const candidates = overloads.flatMap((method): DerivedModifier[] => {
      const framework = method.module.startsWith('_')
        ? { framework: method.module.slice(1, -'_SwiftUI'.length) }
        : {}
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
        return []
      }
      const asyncAction = method.parameters.find((parameter) =>
        /^(?:sending )?@escaping (?:@Sendable |@isolated\(any\) )?\(\) async -> Swift\.Void$/.test(parameter.type))
      if (asyncAction && method.parameters.every((parameter) =>
        parameter === asyncAction || parameter.defaultValue !== undefined))
        return [{ name, module: method.module, kind: 'eventAsync', type: asyncAction.type,
          label: asyncAction.label, ios: ios(method), ...framework }]
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
    if (selected.length === 1) {
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
