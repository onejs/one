import { ios, present, type Declaration } from './inventory'
import type { Control } from './controlTypes'

const emptyEventOrBindingType = /^(?:@escaping )?\(\) -> Swift\.Void\??$|^\(\(\) -> (?:Swift\.Void|\(\))\)\?$|^SwiftUICore\.Binding<Swift\.(?:Bool|String)>$/
const scalarCallbackType = /^(?:@escaping )?\((?:_ [A-Za-z]\w*: )?(Swift\.(?:Bool|String|Int|Float|Double)|CoreFoundation\.CGFloat|Foundation\.URL)\) -> (?:Swift\.Void|\(\))$/
const eventOrBindingType = (type: string) => emptyEventOrBindingType.test(type) || scalarCallbackType.test(type)

export type DerivedArgument = {
  field: string
  label: string
  type: string
  sdkType?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'enum' | 'stringArray' | 'stringSet'
  optional: boolean
  cases?: readonly { name: string; ios: number }[]
}

export type DerivedModifier = {
  name: string
  sdkName?: string
  module?: string
  kind: 'boolean' | 'number' | 'string' | 'url' | 'optionalBoolean' | 'optionalNumber' | 'optionalString' | 'optionalURL' | 'optionalEnum' | 'record' | 'style' | 'event' | 'eventBoolean' | 'eventNumber' | 'eventString' | 'eventEnum' | 'eventEnumPair' | 'eventValueString' | 'bindingBoolean' | 'bindingString'
  ios: number
  type: string
  rawString?: true
  cases?: readonly { name: string; ios: number }[]
  zeroArgument?: true
  framework?: string
  label?: string
  callbackLabel?: string
  callArguments?: readonly { label: string; defaultValue?: string; bridge?: true }[]
  arguments?: readonly DerivedArgument[]
}

const bridgeValueOf = (inventory: readonly Declaration[], ceiling: number) =>
  (type: string): Omit<DerivedArgument, 'field' | 'label'> | undefined => {
    const optional = type.endsWith('?')
    const baseType = type.replace(/\?$/, '')
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
    if (!/^[A-Za-z_]\w*\.[A-Za-z][\w.]*$/.test(baseType)) return
    const [module, ...owner] = baseType.split('.')
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
    if (!cases.length || new Set(cases.map((item) => item.name)).size !== cases.length) return
    return { kind: 'enum', type, optional, cases }
  }

export type DerivedSlotArgument = DerivedArgument | { field: string; label: string; type: string; kind: 'bindingBoolean'; optional: false }
export type DerivedViewSlot = { name: string; sdkName?: string; module: string; label: string; ios: number; directValue?: true; arguments: readonly DerivedSlotArgument[] }

export function deriveViewSlots(inventory: readonly Declaration[], ceiling: number): DerivedViewSlot[] {
  const valueOf = bridgeValueOf(inventory, ceiling)
  const isContent = (d: Declaration, parameter: Declaration['parameters'][number]) => {
    if (parameter.type === '() -> some View') return true
    const generic = /^\(\) -> ([A-Za-z_]\w*)$|^([A-Za-z_]\w*)\??$/.exec(parameter.type)
    return Boolean(generic && d.requirements?.includes(`${generic[1] ?? generic[2]} : SwiftUICore.View`))
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
        parameter.type === 'SwiftUICore.Binding<Swift.Bool>') &&
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
      : `With${required.map((parameter) => parameter.type.split('.').at(-1)!).join('And')}`
    const directSuffix = declarations.length > 1 && directValue
      ? `With${content.label === '_' ? content.type.replace(/\?$/, '') : content.label[0].toUpperCase() + content.label.slice(1)}`
      : suffix
    return { name: `${slot.name}${directSuffix}`, ...(directSuffix ? { sdkName: slot.name } : {}), module: slot.module,
      label: content.label, ios: ios(slot), ...(directValue ? { directValue: true as const } : {}),
      arguments: slot.parameters.filter((parameter) =>
        parameter !== content && parameter.defaultValue === undefined)
        .map((parameter) => parameter.type === 'SwiftUICore.Binding<Swift.Bool>'
          ? { field: parameter.name, label: parameter.label, type: parameter.type, kind: 'bindingBoolean' as const, optional: false as const }
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
  const enumCallbackOf = (type: string) => {
    const single = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> Swift\.Void$/.exec(type)
    const pair = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+), (?:_ [A-Za-z]\w*: )?\1\) -> Swift\.Void$/.exec(type)
    const value = valueOf((single ?? pair)?.[1] ?? '')
    return value?.kind === 'enum' && (value.cases?.length ?? 0) >= 2
      ? { pair: Boolean(pair), cases: value.cases! }
      : undefined
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
      const bridged = method.parameters.filter((p) => eventOrBindingType(p.type) || enumCallbackOf(p.type))
      if (bridged.length === 1 && method.parameters.every((p) => p === bridged[0] || p.defaultValue !== undefined)) {
        const parameter = bridged[0]
        const callbackValue = scalarCallbackType.exec(parameter.type)?.[1]
        const enumCallback = enumCallbackOf(parameter.type)
        const kind = enumCallback
          ? enumCallback.pair ? 'eventEnumPair' : 'eventEnum'
          : parameter.type.includes('Binding<Swift.Bool>')
          ? 'bindingBoolean'
          : parameter.type.includes('Binding<Swift.String>')
            ? 'bindingString'
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
          ...(method.parameters.length > 1 ? {
            callArguments: method.parameters.map((p) =>
              p === parameter ? { label: p.label, bridge: true as const } : { label: p.label, defaultValue: p.defaultValue }
            ),
          } : {}),
        }]
      }
      if (method.parameters.length > 1) {
        const bridgeArguments = (parameters: Declaration['parameters']) => parameters.map((parameter, index) => {
          const value = valueOf(parameter.type)
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
    const concrete = candidates.filter((candidate) => !candidate.type.startsWith('some '))
    const preferred = concrete.length ? concrete : candidates
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
