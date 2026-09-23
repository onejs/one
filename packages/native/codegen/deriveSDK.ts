import { ios, present, type Declaration } from './inventory'
import type { Control } from './controlTypes'

const eventOrBindingType = /^(?:@escaping )?\(\) -> Swift\.Void\??$|^\(\(\) -> Swift\.Void\)\?$|^SwiftUICore\.Binding<Swift\.(?:Bool|String)>$/

export type DerivedModifier = {
  name: string
  kind: 'boolean' | 'number' | 'string' | 'optionalBoolean' | 'optionalNumber' | 'optionalString' | 'event' | 'bindingBoolean' | 'bindingString'
  ios: number
  type: string
  cases?: readonly { name: string; ios: number }[]
  zeroArgument?: true
  framework?: string
  label?: string
  callArguments?: readonly { label: string; defaultValue?: string; bridge?: true }[]
}

export type DerivedViewSlot = { name: string; ios: number }

export function deriveTabViewSlots(inventory: readonly Declaration[], ceiling: number): DerivedViewSlot[] {
  const slots = inventory.filter((d) =>
    d.kind === 'func' && d.module === 'SwiftUI' && d.owner.split('.').at(-1) === 'View' &&
    /^tabView[A-Z]/.test(d.name) && d.parameters.length === 1 &&
    d.parameters[0].label === 'content' && d.parameters[0].type === '() -> Content' &&
    d.requirements?.length === 1 && d.requirements[0] === 'Content : SwiftUICore.View' &&
    present(d) && ios(d) <= ceiling
  )
  return slots.map((slot) => ({ name: slot.name, ios: ios(slot) })).sort((a, b) => a.name.localeCompare(b.name))
}

// parameterless methods and one-argument methods with a bridge scalar or a
// static-case value have enough information to generate a prop and Swift call.
export function deriveModifiers(
  inventory: readonly Declaration[],
  ceiling: number,
  reserved: readonly { name: string }[]
): DerivedModifier[] {
  const reservedNames = new Set(reserved.map((field) => field.name))
  const methods = inventory.filter(
    (d) =>
      d.kind === 'func' &&
      (d.module === 'SwiftUI' ||
        d.module === 'SwiftUICore' ||
        (d.parameters.length === 0 && /^_[A-Za-z]+_SwiftUI$/.test(d.module))) &&
      d.owner.split('.').at(-1) === 'View' &&
      /^[a-z]/.test(d.name) &&
      (d.parameters.length === 0 ||
        d.parameters.length === 1 ||
        (d.parameters.length > 0 && d.parameters.every((p) => p.defaultValue !== undefined ||
          eventOrBindingType.test(p.type)))) &&
      !d.requirements?.length &&
      present(d) &&
      ios(d) <= ceiling &&
      !reservedNames.has(d.name)
  )
  const byName = new Map<string, Declaration[]>()
  for (const method of methods)
    byName.set(method.name, [...(byName.get(method.name) ?? []), method])
  const result: DerivedModifier[] = []
  for (const [name, overloads] of byName) {
    const candidates = overloads.flatMap((method): DerivedModifier[] => {
      if (method.parameters.length === 0)
        return [
          {
            name,
            kind: 'boolean',
            type: '',
            ios: ios(method),
            zeroArgument: true,
            ...(method.module.startsWith('_')
              ? { framework: method.module.slice(1, -'_SwiftUI'.length) }
              : {}),
          },
        ]
      const bridged = method.parameters.filter((p) => eventOrBindingType.test(p.type))
      if (bridged.length === 1 && method.parameters.every((p) => p === bridged[0] || p.defaultValue !== undefined)) {
        const parameter = bridged[0]
        const kind = parameter.type.includes('Binding<Swift.Bool>')
          ? 'bindingBoolean'
          : parameter.type.includes('Binding<Swift.String>')
            ? 'bindingString'
            : 'event'
        return [{
          name, kind, type: parameter.type, label: parameter.label, ios: ios(method),
          ...(method.parameters.length > 1 ? {
            callArguments: method.parameters.map((p) =>
              p === parameter ? { label: p.label, bridge: true as const } : { label: p.label, defaultValue: p.defaultValue }
            ),
          } : {}),
        }]
      }
      if (method.parameters.length !== 1) return []
      const { type, label } = method.parameters[0]
      const baseType = type.replace(/\?$/, '')
      const baseKind =
        baseType === 'Swift.Bool'
          ? 'boolean'
          : [
                'Swift.Double',
                'Swift.Float',
                'Swift.Int',
                'CoreFoundation.CGFloat',
              ].includes(baseType)
            ? 'number'
            : baseType === 'Swift.String' || baseType === 'SwiftUICore.Text'
              ? 'string'
              : undefined
      if (baseKind) {
        const kind = type.endsWith('?') ? `optional${baseKind[0].toUpperCase()}${baseKind.slice(1)}` as DerivedModifier['kind'] : baseKind
        return [{ name, kind, type, ios: ios(method), ...(label === '_' ? {} : { label }) }]
      }
      if (!/^(SwiftUI|SwiftUICore)\.[A-Za-z][\w.]*$/.test(type)) return []
      const [module, ...owner] = type.split('.')
      const cases = inventory
        .filter(
          (d) =>
            d.module === module &&
            (d.owner === owner.join('.') || d.owner === type) &&
            d.kind === 'static' &&
            (d.type?.replace('?', '') === owner.join('.') ||
              d.type?.replace('?', '') === type) &&
            /^[a-z]/.test(d.name) &&
            present(d) &&
            ios(d) <= ceiling
        )
        .map((d) => ({ name: d.name, ios: ios(d) }))
      if (!cases.length || new Set(cases.map((item) => item.name)).size !== cases.length)
        return []
      return [{ name, kind: 'string', type, ios: ios(method), cases, ...(label === '_' ? {} : { label }) }]
    })
    // overloads with the same public name need a semantic choice. neither their
    // order in the SDK nor a guessed preferred type is a sound contract.
    if (candidates.length === 1) result.push(candidates[0])
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
